-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0.00,
    max_discount_amount DECIMAL(10, 2),
    applicable_order_types TEXT[] DEFAULT ARRAY['food', 'store']::TEXT[],
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON public.promo_codes(is_active);

-- Add promo_code column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS promo_code TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS promo_discount DECIMAL(10, 2) DEFAULT 0.00;

-- Enable RLS on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS: anyone authenticated can read active promo codes (to validate them)
DROP POLICY IF EXISTS "authenticated_read_promo_codes" ON public.promo_codes;
CREATE POLICY "authenticated_read_promo_codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (is_active = true);

-- Function to validate and apply a promo code
CREATE OR REPLACE FUNCTION public.validate_promo_code(
    p_code TEXT,
    p_order_amount DECIMAL,
    p_order_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promo RECORD;
    v_discount DECIMAL(10, 2);
BEGIN
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE UPPER(code) = UPPER(p_code)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (usage_limit IS NULL OR used_count < usage_limit)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired promo code');
    END IF;

    IF p_order_amount < v_promo.min_order_amount THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Minimum order amount of ₹' || v_promo.min_order_amount::TEXT || ' required'
        );
    END IF;

    IF NOT (p_order_type = ANY(v_promo.applicable_order_types)) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Promo code not applicable for this order type');
    END IF;

    IF v_promo.discount_type = 'percentage' THEN
        v_discount := ROUND((p_order_amount * v_promo.discount_value / 100)::DECIMAL, 2);
        IF v_promo.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_promo.max_discount_amount);
        END IF;
    ELSE
        v_discount := LEAST(v_promo.discount_value, p_order_amount);
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'discount', v_discount,
        'discount_type', v_promo.discount_type,
        'discount_value', v_promo.discount_value,
        'description', v_promo.description,
        'max_discount_amount', v_promo.max_discount_amount
    );
END;
$$;

-- Seed sample promo codes
DO $$
BEGIN
    INSERT INTO public.promo_codes (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, applicable_order_types, usage_limit)
    VALUES
        ('WELCOME20', 'Welcome offer - 20% off your first order', 'percentage', 20.00, 99.00, 100.00, ARRAY['food', 'store']::TEXT[], 1000),
        ('FLAT50', 'Flat ₹50 off on orders above ₹299', 'flat', 50.00, 299.00, NULL, ARRAY['food', 'store']::TEXT[], 500),
        ('FOOD15', '15% off on food orders', 'percentage', 15.00, 149.00, 75.00, ARRAY['food']::TEXT[], NULL),
        ('STORE10', '10% off on store orders', 'percentage', 10.00, 99.00, 50.00, ARRAY['store']::TEXT[], NULL),
        ('EDSTOP30', 'EdStop special - 30% off up to ₹150', 'percentage', 30.00, 199.00, 150.00, ARRAY['food', 'store']::TEXT[], 200)
    ON CONFLICT DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Promo code seed failed: %', SQLERRM;
END $$;
