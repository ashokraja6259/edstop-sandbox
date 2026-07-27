-- Authoritative additive hardening for databases where earlier vulnerable migrations ran.
-- This migration intentionally does not delete users or business/audit history.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'student'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = statement_timestamp();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_select_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_safe_user_profile_fields" ON public.user_profiles;
CREATE POLICY "users_select_own_user_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));
CREATE POLICY "users_update_own_safe_user_profile_fields"
ON public.user_profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Column grants make future columns deny-by-default.
REVOKE ALL ON TABLE public.user_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON TABLE public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id <> v_caller
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles AS up
       WHERE up.id = v_caller AND up.role = 'admin'::public.user_role
     ) THEN
    RAISE EXCEPTION 'insufficient privilege' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT up.role::text FROM public.user_profiles AS up WHERE up.id = p_user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_user_role(
  p_user_id uuid,
  p_role public.user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_profiles AS up
    WHERE up.id = v_caller AND up.role = 'admin'::public.user_role
  ) THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.user_profiles
  SET role = p_role, updated_at = statement_timestamp()
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_assign_user_role(uuid, public.user_role)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_user_role(uuid, public.user_role)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles AS up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'::public.user_role
    );
$function$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_wallets" ON public.wallets;
DROP POLICY IF EXISTS "users_select_own_wallets" ON public.wallets;
CREATE POLICY "users_select_own_wallets"
ON public.wallets FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON TABLE public.wallets FROM anon, authenticated;
GRANT SELECT ON TABLE public.wallets TO authenticated;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_view_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_create_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_select_own_transactions" ON public.transactions;
CREATE POLICY "users_select_own_transactions"
ON public.transactions FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON TABLE public.transactions FROM anon, authenticated;
GRANT SELECT ON TABLE public.transactions TO authenticated;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_own_wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "users_select_own_wallet_transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON TABLE public.wallet_transactions FROM anon, authenticated;
GRANT SELECT ON TABLE public.wallet_transactions TO authenticated;

-- service_role remains a trusted backend path and bypasses RLS by design.
GRANT ALL ON TABLE public.user_profiles TO service_role;
GRANT ALL ON TABLE public.wallets TO service_role;
GRANT ALL ON TABLE public.transactions TO service_role;
GRANT ALL ON TABLE public.wallet_transactions TO service_role;

-- Trigger-only definers have fixed resolution and no callable API surface.
ALTER FUNCTION public.create_wallet_for_user() SET search_path = pg_catalog;
ALTER FUNCTION public.update_wallet_balance() SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION public.create_wallet_for_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_wallet_balance() FROM PUBLIC, anon, authenticated;

-- Checkout verifies auth.uid() equals p_user_id and uses schema-qualified relations.
ALTER FUNCTION public.create_order_atomic(uuid, uuid, text, jsonb, numeric, text, text)
  SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION public.create_order_atomic(uuid, uuid, text, jsonb, numeric, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, uuid, text, jsonb, numeric, text, text)
  TO authenticated;
