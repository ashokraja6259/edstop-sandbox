-- Replace broad profile self-management with safe self-read and limited profile edits.
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;

CREATE POLICY "users_select_own_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_update_own_safe_user_profile_fields"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

REVOKE UPDATE ON TABLE public.user_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON TABLE public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'student'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$;

-- Remove direct client order writes. Order creation/status changes must use trusted server/RPC paths.
DROP POLICY IF EXISTS "users_view_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_create_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_delete_own_orders" ON public.orders;

CREATE POLICY "users_and_riders_view_related_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR rider_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders FROM anon, authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;

-- Remove direct client wallet and ledger mutations.
DROP POLICY IF EXISTS "users_manage_own_wallets" ON public.wallets;

CREATE POLICY "users_select_own_wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallets FROM anon, authenticated;
GRANT SELECT ON TABLE public.wallets TO authenticated;

DROP POLICY IF EXISTS "users_view_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_create_own_transactions" ON public.transactions;

CREATE POLICY "users_select_own_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.transactions FROM anon, authenticated;
GRANT SELECT ON TABLE public.transactions TO authenticated;

-- Tables referenced by checkout/order flows.
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_id TEXT,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_order_item_quantity CHECK (quantity > 0),
  CONSTRAINT positive_order_item_amounts CHECK (price >= 0 AND total_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id
ON public.order_items(menu_item_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_and_riders_select_related_order_items" ON public.order_items;
CREATE POLICY "users_and_riders_select_related_order_items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR o.rider_id = auth.uid())
  )
);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.order_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_status public.order_status,
  new_status public.order_status,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id
ON public.order_events(order_id);

CREATE INDEX IF NOT EXISTS idx_order_events_created_at
ON public.order_events(created_at DESC);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_and_riders_select_related_order_events" ON public.order_events;
CREATE POLICY "users_and_riders_select_related_order_events"
ON public.order_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_events.order_id
      AND (o.user_id = auth.uid() OR o.rider_id = auth.uid())
  )
);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.order_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.order_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
ON public.wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_id
ON public.wallet_transactions(reference_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "users_select_own_wallet_transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallet_transactions FROM anon, authenticated;
GRANT SELECT ON TABLE public.wallet_transactions TO authenticated;

-- The previous "service" policy allowed every authenticated user to insert alert logs.
DROP POLICY IF EXISTS "service_insert_promo_alert_logs" ON public.promo_alert_logs;
DROP POLICY IF EXISTS "admin_insert_promo_alert_logs" ON public.promo_alert_logs;

CREATE POLICY "admin_insert_promo_alert_logs"
ON public.promo_alert_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);
