-- Create enum types for orders and transactions
DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');

DROP TYPE IF EXISTS public.order_type CASCADE;
CREATE TYPE public.order_type AS ENUM ('food', 'store', 'other');

DROP TYPE IF EXISTS public.transaction_type CASCADE;
CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit', 'refund');

DROP TYPE IF EXISTS public.transaction_status CASCADE;
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Create unique index on user_id (one wallet per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Create student_profiles table (extended profile for students)
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE,
    university TEXT,
    major TEXT,
    year_of_study INTEGER,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on user_id (one student profile per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON public.student_profiles(student_id);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    order_type public.order_type DEFAULT 'food'::public.order_type NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    final_amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,
    delivery_address TEXT,
    delivery_instructions TEXT,
    estimated_delivery_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    rider_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    restaurant_name TEXT,
    items JSONB DEFAULT '[]'::JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amounts CHECK (total_amount >= 0 AND final_amount >= 0)
);

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type public.transaction_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status public.transaction_status DEFAULT 'pending'::public.transaction_status NOT NULL,
    description TEXT,
    reference_number TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_transaction_amount CHECK (amount > 0)
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- Function to update wallet balance after transaction
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status = 'completed'::public.transaction_status THEN
        IF NEW.transaction_type = 'credit'::public.transaction_type OR NEW.transaction_type = 'refund'::public.transaction_type THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.wallet_id;
        ELSIF NEW.transaction_type = 'debit'::public.transaction_type THEN
            UPDATE public.wallets
            SET balance = balance - NEW.amount,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.wallet_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Function to automatically create wallet for new users
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (NEW.id, 0.00, 'USD')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets
DROP POLICY IF EXISTS "users_manage_own_wallets" ON public.wallets;
CREATE POLICY "users_manage_own_wallets"
ON public.wallets
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for student_profiles
DROP POLICY IF EXISTS "users_manage_own_student_profiles" ON public.student_profiles;
CREATE POLICY "users_manage_own_student_profiles"
ON public.student_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for orders
DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
CREATE POLICY "users_view_own_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR rider_id = auth.uid());

DROP POLICY IF EXISTS "users_create_own_orders" ON public.orders;
CREATE POLICY "users_create_own_orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_orders" ON public.orders;
CREATE POLICY "users_update_own_orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR rider_id = auth.uid())
WITH CHECK (user_id = auth.uid() OR rider_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_orders" ON public.orders;
CREATE POLICY "users_delete_own_orders"
ON public.orders
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for transactions
DROP POLICY IF EXISTS "users_view_own_transactions" ON public.transactions;
CREATE POLICY "users_view_own_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_create_own_transactions" ON public.transactions;
CREATE POLICY "users_create_own_transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON public.transactions;
CREATE TRIGGER trigger_update_wallet_balance
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wallet_balance();

DROP TRIGGER IF EXISTS trigger_create_wallet_for_user ON public.user_profiles;
CREATE TRIGGER trigger_create_wallet_for_user
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_wallet_for_user();

DROP TRIGGER IF EXISTS trigger_update_wallets_updated_at ON public.wallets;
CREATE TRIGGER trigger_update_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER trigger_update_student_profiles_updated_at
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON public.transactions;
CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Mock data
DO $$
DECLARE
    student_user_id UUID;
    rider_user_id UUID;
    student_wallet_id UUID;
    order_id_1 UUID := gen_random_uuid();
    order_id_2 UUID := gen_random_uuid();
BEGIN
    -- Get existing user IDs
    SELECT id INTO student_user_id FROM public.user_profiles WHERE role = 'student'::public.user_role LIMIT 1;
    SELECT id INTO rider_user_id FROM public.user_profiles WHERE role = 'rider'::public.user_role LIMIT 1;

    IF student_user_id IS NOT NULL THEN
        -- Create student profile
        INSERT INTO public.student_profiles (
            user_id, student_id, university, major, year_of_study,
            phone_number, address, city, state, zip_code
        ) VALUES (
            student_user_id,
            'STU2024001',
            'State University',
            'Computer Science',
            3,
            '+1-555-0123',
            '123 Campus Drive, Apt 4B',
            'University City',
            'CA',
            '90210'
        )
        ON CONFLICT (user_id) DO NOTHING;

        -- Get wallet ID (created automatically by trigger)
        SELECT id INTO student_wallet_id FROM public.wallets WHERE user_id = student_user_id LIMIT 1;

        -- Create sample orders
        INSERT INTO public.orders (
            id, user_id, order_number, order_type, status, total_amount,
            delivery_fee, tax_amount, discount_amount, final_amount,
            payment_method, delivery_address, restaurant_name, items,
            estimated_delivery_time, rider_id
        ) VALUES
            (
                order_id_1,
                student_user_id,
                'ORD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-001',
                'food'::public.order_type,
                'out_for_delivery'::public.order_status,
                25.50,
                3.99,
                2.04,
                0.00,
                31.53,
                'wallet',
                '123 Campus Drive, Apt 4B, University City, CA 90210',
                'Campus Cafe',
                jsonb_build_array(
                    jsonb_build_object('name', 'Chicken Burger', 'quantity', 1, 'price', 12.99),
                    jsonb_build_object('name', 'French Fries', 'quantity', 1, 'price', 4.99),
                    jsonb_build_object('name', 'Coke', 'quantity', 2, 'price', 3.76)
                ),
                CURRENT_TIMESTAMP + INTERVAL '30 minutes',
                rider_user_id
            ),
            (
                order_id_2,
                student_user_id,
                'ORD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-002',
                'store'::public.order_type,
                'delivered'::public.order_status,
                45.00,
                5.00,
                3.60,
                5.00,
                48.60,
                'wallet',
                '123 Campus Drive, Apt 4B, University City, CA 90210',
                'Campus Store',
                jsonb_build_array(
                    jsonb_build_object('name', 'Notebook', 'quantity', 3, 'price', 15.00),
                    jsonb_build_object('name', 'Pen Set', 'quantity', 2, 'price', 15.00)
                ),
                CURRENT_TIMESTAMP - INTERVAL '2 hours',
                rider_user_id
            )
        ON CONFLICT (id) DO NOTHING;

        IF student_wallet_id IS NOT NULL THEN
            -- Create sample transactions
            INSERT INTO public.transactions (
                user_id, wallet_id, order_id, transaction_type, amount,
                status, description, reference_number
            ) VALUES
                (
                    student_user_id,
                    student_wallet_id,
                    NULL,
                    'credit'::public.transaction_type,
                    100.00,
                    'completed'::public.transaction_status,
                    'Initial wallet credit',
                    'TXN-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHHMMSS') || '-001'
                ),
                (
                    student_user_id,
                    student_wallet_id,
                    order_id_1,
                    'debit'::public.transaction_type,
                    31.53,
                    'completed'::public.transaction_status,
                    'Payment for order ' || 'ORD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-001',
                    'TXN-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHHMMSS') || '-002'
                ),
                (
                    student_user_id,
                    student_wallet_id,
                    order_id_2,
                    'debit'::public.transaction_type,
                    48.60,
                    'completed'::public.transaction_status,
                    'Payment for order ' || 'ORD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-002',
                    'TXN-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHHMMSS') || '-003'
                )
            ON CONFLICT (reference_number) DO NOTHING;
        END IF;

        RAISE NOTICE 'Mock data created successfully';
        RAISE NOTICE 'Student wallet balance should be: 19.87 (100.00 - 31.53 - 48.60)';
    ELSE
        RAISE NOTICE 'No student user found. Please run the user roles migration first.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;