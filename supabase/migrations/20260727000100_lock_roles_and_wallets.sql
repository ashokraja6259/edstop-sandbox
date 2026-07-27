-- Authoritative additive hardening for databases where earlier vulnerable migrations ran.
-- This migration intentionally does not delete users or business/audit history.

DO $required_objects$
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    RAISE EXCEPTION
      'required relation public.user_profiles is missing; role hardening cannot proceed';
  END IF;
END;
$required_objects$;

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

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_requested_user_id uuid := user_id;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF v_requested_user_id <> v_caller
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles AS up
       WHERE up.id = v_caller AND up.role = 'admin'::public.user_role
     ) THEN
    RAISE EXCEPTION 'insufficient privilege' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT up.role::text
    FROM public.user_profiles AS up
    WHERE up.id = v_requested_user_id
  );
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

-- Older or partially migrated environments may not contain every wallet object.
-- Harden each object if present without allowing one missing object to abort the
-- profile/role security boundary.
DO $wallets$
BEGIN
  IF to_regclass('public.wallets') IS NULL THEN
    RAISE WARNING 'optional relation public.wallets is missing; wallet hardening skipped';
  ELSE
    EXECUTE 'ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "users_manage_own_wallets" ON public.wallets';
    EXECUTE 'DROP POLICY IF EXISTS "users_select_own_wallets" ON public.wallets';
    EXECUTE 'CREATE POLICY "users_select_own_wallets"
      ON public.wallets FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()))';
    EXECUTE 'REVOKE ALL ON TABLE public.wallets FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.wallets TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.wallets TO service_role';
  END IF;
END;
$wallets$;

DO $transactions$
BEGIN
  IF to_regclass('public.transactions') IS NULL THEN
    RAISE WARNING 'optional relation public.transactions is missing; transaction ledger hardening skipped';
  ELSE
    EXECUTE 'ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "users_view_own_transactions" ON public.transactions';
    EXECUTE 'DROP POLICY IF EXISTS "users_create_own_transactions" ON public.transactions';
    EXECUTE 'DROP POLICY IF EXISTS "users_select_own_transactions" ON public.transactions';
    EXECUTE 'CREATE POLICY "users_select_own_transactions"
      ON public.transactions FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()))';
    EXECUTE 'REVOKE ALL ON TABLE public.transactions FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.transactions TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.transactions TO service_role';
  END IF;
END;
$transactions$;

DO $wallet_transactions$
BEGIN
  IF to_regclass('public.wallet_transactions') IS NULL THEN
    RAISE WARNING 'optional relation public.wallet_transactions is missing; wallet ledger hardening skipped';
  ELSE
    EXECUTE 'ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "users_select_own_wallet_transactions" ON public.wallet_transactions';
    EXECUTE 'CREATE POLICY "users_select_own_wallet_transactions"
      ON public.wallet_transactions FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()))';
    EXECUTE 'REVOKE ALL ON TABLE public.wallet_transactions FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.wallet_transactions TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.wallet_transactions TO service_role';
  END IF;
END;
$wallet_transactions$;

-- service_role remains a trusted backend path and bypasses RLS by design.
GRANT ALL ON TABLE public.user_profiles TO service_role;

-- Trigger-only definers have fixed resolution and no callable API surface.
DO $wallet_functions$
BEGIN
  IF to_regprocedure('public.create_wallet_for_user()') IS NULL THEN
    RAISE WARNING 'optional function public.create_wallet_for_user() is missing; hardening skipped';
  ELSE
    EXECUTE 'ALTER FUNCTION public.create_wallet_for_user() SET search_path = pg_catalog';
    EXECUTE 'REVOKE ALL ON FUNCTION public.create_wallet_for_user()
      FROM PUBLIC, anon, authenticated';
  END IF;

  IF to_regprocedure('public.update_wallet_balance()') IS NULL THEN
    RAISE WARNING 'optional function public.update_wallet_balance() is missing; hardening skipped';
  ELSE
    EXECUTE 'ALTER FUNCTION public.update_wallet_balance() SET search_path = pg_catalog';
    EXECUTE 'REVOKE ALL ON FUNCTION public.update_wallet_balance()
      FROM PUBLIC, anon, authenticated';
  END IF;
END;
$wallet_functions$;

-- Checkout verifies auth.uid() equals p_user_id and uses schema-qualified relations.
DO $checkout_function$
BEGIN
  IF to_regprocedure(
    'public.create_order_atomic(uuid,uuid,text,jsonb,numeric,text,text)'
  ) IS NULL THEN
    RAISE WARNING
      'optional function public.create_order_atomic(uuid,uuid,text,jsonb,numeric,text,text) is missing; checkout grant hardening skipped';
  ELSE
    EXECUTE 'ALTER FUNCTION public.create_order_atomic(
      uuid, uuid, text, jsonb, numeric, text, text
    ) SET search_path = pg_catalog';
    EXECUTE 'REVOKE ALL ON FUNCTION public.create_order_atomic(
      uuid, uuid, text, jsonb, numeric, text, text
    ) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_order_atomic(
      uuid, uuid, text, jsonb, numeric, text, text
    ) TO authenticated';
  END IF;
END;
$checkout_function$;
