\set ON_ERROR_STOP on

BEGIN;

-- Reproduce the four manually-created Production contracts.
DROP FUNCTION IF EXISTS public.admin_update_order_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.vendor_update_order_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.rider_claim_order(UUID);
DROP FUNCTION IF EXISTS public.rider_mark_delivered(UUID);

CREATE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_status public.order_status
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can update order status';
  END IF;
  UPDATE public.orders SET status = p_status WHERE id = p_order_id;
END;
$$;

CREATE FUNCTION public.vendor_update_order_status(
  p_order_id UUID,
  p_status public.order_status
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders SET status = p_status WHERE id = p_order_id;
END;
$$;

CREATE FUNCTION public.rider_claim_order(
  p_order_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'out_for_delivery'::public.order_status
  WHERE id = p_order_id;
END;
$$;

CREATE FUNCTION public.rider_mark_delivered(
  p_order_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'delivered'::public.order_status
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(
  UUID, public.order_status
) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_update_order_status(
  UUID, public.order_status
) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rider_claim_order(UUID)
  TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rider_mark_delivered(UUID)
  TO PUBLIC, anon, authenticated;

-- Reproduce the compatible Production restaurant drift. The FK normalization
-- is intentionally deferred, while nullability and policy drift are repaired.
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_owner_id_fkey;
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id);
ALTER TABLE public.restaurants
  ALTER COLUMN is_active DROP NOT NULL,
  ALTER COLUMN is_open DROP NOT NULL;

DROP POLICY IF EXISTS "Admin full access restaurants"
  ON public.restaurants;
CREATE POLICY "Admin full access restaurants"
  ON public.restaurants FOR ALL TO PUBLIC
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Vendor manage own restaurant"
  ON public.restaurants;
CREATE POLICY "Vendor manage own restaurant"
  ON public.restaurants FOR UPDATE TO PUBLIC
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admin full access menu"
  ON public.menu_items;
CREATE POLICY "Admin full access menu"
  ON public.menu_items FOR ALL TO PUBLIC
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Vendor manage own menu"
  ON public.menu_items;
CREATE POLICY "Vendor manage own menu"
  ON public.menu_items FOR ALL TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants AS r
      WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

\ir ../migrations/20260731000300_reconcile_operational_rpc_drift.sql
\ir ../migrations/20260731000400_harden_anonymous_public_surface.sql

DO $assertions$
DECLARE
  v_fk_definition TEXT;
BEGIN
  IF to_regprocedure(
    'public.admin_update_order_status(uuid,public.order_status)'
  ) IS NOT NULL OR to_regprocedure(
    'public.vendor_update_order_status(uuid,public.order_status)'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'legacy enum overload remains';
  END IF;

  IF pg_get_function_result(
    'public.admin_update_order_status(uuid,text)'::regprocedure
  ) <> 'jsonb'
  OR pg_get_function_result(
    'public.vendor_update_order_status(uuid,text)'::regprocedure
  ) <> 'jsonb'
  OR pg_get_function_result(
    'public.rider_claim_order(uuid)'::regprocedure
  ) <> 'jsonb'
  OR pg_get_function_result(
    'public.rider_mark_delivered(uuid)'::regprocedure
  ) <> 'jsonb' THEN
    RAISE EXCEPTION 'final operational RPC return contract is incorrect';
  END IF;

  IF has_function_privilege(
    'anon', 'public.admin_update_order_status(uuid,text)', 'EXECUTE'
  )
  OR has_function_privilege(
    'anon', 'public.vendor_update_order_status(uuid,text)', 'EXECUTE'
  )
  OR has_function_privilege(
    'anon', 'public.rider_claim_order(uuid)', 'EXECUTE'
  )
  OR has_function_privilege(
    'anon', 'public.rider_mark_delivered(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon operational RPC execution remains';
  END IF;

  SELECT pg_get_constraintdef(c.oid)
  INTO v_fk_definition
  FROM pg_constraint AS c
  WHERE c.conrelid = 'public.restaurants'::regclass
    AND c.conname = 'restaurants_owner_id_fkey';

  IF v_fk_definition NOT LIKE
    'FOREIGN KEY (owner_id) REFERENCES auth.users(id)%' THEN
    RAISE EXCEPTION 'deferred Production FK was unexpectedly replaced';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'restaurants'
      AND column_name IN ('is_active', 'is_open')
      AND (
        is_nullable <> 'NO'
        OR column_default <> 'true'
      )
  ) THEN
    RAISE EXCEPTION 'restaurant availability constraints were not repaired';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'Admin full access restaurants',
        'Vendor manage own restaurant',
        'Admin full access menu',
        'Vendor manage own menu',
        'Public view restaurants',
        'public_read_restaurants',
        'Public view menu',
        'public_read_menu_items'
      )
  ) THEN
    RAISE EXCEPTION 'legacy permissive policy remains';
  END IF;

  IF NOT has_table_privilege('anon', 'public.restaurants', 'SELECT')
     OR NOT has_table_privilege('anon', 'public.menu_items', 'SELECT')
     OR has_table_privilege(
       'anon', 'public.restaurants', 'INSERT,UPDATE,DELETE'
     )
     OR has_table_privilege(
       'anon', 'public.menu_items', 'INSERT,UPDATE,DELETE'
     ) THEN
    RAISE EXCEPTION 'anonymous restaurant/menu grants are incorrect';
  END IF;

  IF NOT (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.restaurants'::regclass
  ) OR NOT (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.menu_items'::regclass
  ) THEN
    RAISE EXCEPTION 'restaurant/menu RLS was disabled';
  END IF;

  IF has_function_privilege(
    'authenticated', 'public.update_updated_at_column()', 'EXECUTE'
  ) OR has_function_privilege(
    'authenticated', 'public.update_food_ordering_updated_at()', 'EXECUTE'
  ) OR EXISTS (
    SELECT 1
    FROM pg_default_acl AS d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) AS privilege
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype = 'f'
      AND privilege.privilege_type = 'EXECUTE'
      AND (
        privilege.grantee = 0
        OR pg_get_userbyid(privilege.grantee) IN ('anon', 'authenticated')
      )
  ) THEN
    RAISE EXCEPTION 'client function execution defaults remain open';
  END IF;
END;
$assertions$;

ROLLBACK;
