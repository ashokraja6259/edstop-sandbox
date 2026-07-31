-- Reconcile manually-created Production RPCs with the repository contract.
--
-- Production previously contained enum-argument/void-return order RPCs. The
-- application calls text arguments and the repository contract returns JSONB,
-- so the legacy overloads must be removed before the audited functions can be
-- installed. Anonymous execution is revoked explicitly after recreation.

DO $dependency_check$
DECLARE
  v_function_oid OID;
  v_dependent TEXT;
BEGIN
  FOREACH v_function_oid IN ARRAY ARRAY[
    to_regprocedure(
      'public.admin_update_order_status(uuid,public.order_status)'
    )::OID,
    to_regprocedure(
      'public.vendor_update_order_status(uuid,public.order_status)'
    )::OID,
    to_regprocedure('public.rider_claim_order(uuid)')::OID,
    to_regprocedure('public.rider_mark_delivered(uuid)')::OID
  ]
  LOOP
    CONTINUE WHEN v_function_oid IS NULL;

    SELECT pg_describe_object(d.classid, d.objid, d.objsubid)
    INTO v_dependent
    FROM pg_depend AS d
    WHERE d.refclassid = 'pg_proc'::regclass
      AND d.refobjid = v_function_oid
      AND NOT (
        d.classid = 'pg_proc'::regclass
        AND d.objid = v_function_oid
      )
    LIMIT 1;

    IF v_dependent IS NOT NULL THEN
      RAISE EXCEPTION
        'cannot reconcile operational RPC; dependent object exists: %',
        v_dependent;
    END IF;
  END LOOP;
END;
$dependency_check$;

-- These are the only legacy signatures removed. CASCADE is intentionally not
-- used: the dependency check above fails closed instead.
DROP FUNCTION IF EXISTS public.admin_update_order_status(
  UUID, public.order_status
);
DROP FUNCTION IF EXISTS public.vendor_update_order_status(
  UUID, public.order_status
);
DROP FUNCTION IF EXISTS public.rider_claim_order(UUID);
DROP FUNCTION IF EXISTS public.rider_mark_delivered(UUID);

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_old_status public.order_status;
  v_new_status public.order_status;
  v_rider_id UUID;
BEGIN
  IF v_caller IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles AS up
    WHERE up.id = v_caller
      AND up.role = 'admin'::public.user_role
  ) THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN (
    'pending', 'confirmed', 'preparing', 'ready',
    'out_for_delivery', 'delivered', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid order status' USING ERRCODE = '22023';
  END IF;

  SELECT o.status, o.rider_id
  INTO v_old_status, v_rider_id
  FROM public.orders AS o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  v_new_status := p_status::public.order_status;

  IF v_new_status = v_old_status THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'status', v_old_status,
      'idempotent_replay', true
    );
  END IF;

  IF v_new_status IN ('out_for_delivery', 'delivered')
     AND v_rider_id IS NULL THEN
    RAISE EXCEPTION 'rider assignment required for dispatch or delivery'
      USING ERRCODE = '55000';
  END IF;

  IF NOT (
    (v_old_status = 'pending' AND v_new_status IN ('confirmed', 'cancelled'))
    OR (v_old_status = 'confirmed' AND v_new_status IN ('preparing', 'cancelled'))
    OR (v_old_status = 'preparing' AND v_new_status IN ('ready', 'cancelled'))
    OR (
      v_old_status = 'ready'
      AND v_new_status IN ('out_for_delivery', 'cancelled')
    )
    OR (
      v_old_status = 'out_for_delivery'
      AND v_new_status IN ('delivered', 'cancelled')
    )
  ) THEN
    RAISE EXCEPTION 'invalid order status transition: % -> %',
      v_old_status, v_new_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET
    status = v_new_status,
    dispatched_at = CASE
      WHEN v_new_status = 'out_for_delivery'
        THEN COALESCE(dispatched_at, statement_timestamp())
      ELSE dispatched_at
    END,
    actual_delivery_time = CASE
      WHEN v_new_status = 'delivered'
        THEN COALESCE(actual_delivery_time, statement_timestamp())
      ELSE actual_delivery_time
    END
  WHERE id = p_order_id;

  INSERT INTO public.order_events (
    order_id, event_type, old_status, new_status, metadata
  )
  VALUES (
    p_order_id,
    'ORDER_STATUS_CHANGED',
    v_old_status,
    v_new_status,
    jsonb_build_object('actor_id', v_caller, 'actor_role', 'admin')
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', v_new_status,
    'idempotent_replay', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vendor_update_order_status(
  p_order_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_restaurant_id UUID;
  v_old_status public.order_status;
  v_new_status public.order_status;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT up.role::TEXT
  INTO v_role
  FROM public.user_profiles AS up
  WHERE up.id = v_caller;

  IF v_role NOT IN ('vendor', 'admin') THEN
    RAISE EXCEPTION 'vendor role required' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('confirmed', 'preparing', 'ready') THEN
    RAISE EXCEPTION 'invalid vendor order status' USING ERRCODE = '22023';
  END IF;

  SELECT o.status, o.restaurant_id
  INTO v_old_status, v_restaurant_id
  FROM public.orders AS o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'vendor' AND (
    v_restaurant_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      WHERE r.id = v_restaurant_id
        AND r.owner_id = v_caller
    )
  ) THEN
    RAISE EXCEPTION 'order is outside vendor scope' USING ERRCODE = '42501';
  END IF;

  v_new_status := p_status::public.order_status;

  IF v_new_status = v_old_status THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'status', v_old_status,
      'idempotent_replay', true
    );
  END IF;

  IF NOT (
    (v_old_status = 'pending' AND v_new_status = 'confirmed')
    OR (v_old_status = 'confirmed' AND v_new_status = 'preparing')
    OR (v_old_status = 'preparing' AND v_new_status = 'ready')
  ) THEN
    RAISE EXCEPTION 'invalid vendor order status transition: % -> %',
      v_old_status, v_new_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET status = v_new_status
  WHERE id = p_order_id;

  INSERT INTO public.order_events (
    order_id, event_type, old_status, new_status, metadata
  )
  VALUES (
    p_order_id,
    'ORDER_STATUS_CHANGED',
    v_old_status,
    v_new_status,
    jsonb_build_object('actor_id', v_caller, 'actor_role', v_role)
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', v_new_status,
    'idempotent_replay', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rider_claim_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_old_status public.order_status;
  v_rider_id UUID;
BEGIN
  IF v_caller IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles AS up
    WHERE up.id = v_caller
      AND up.role = 'rider'::public.user_role
  ) THEN
    RAISE EXCEPTION 'rider role required' USING ERRCODE = '42501';
  END IF;

  SELECT o.status, o.rider_id
  INTO v_old_status, v_rider_id
  FROM public.orders AS o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_old_status = 'out_for_delivery' AND v_rider_id = v_caller THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'status', v_old_status,
      'idempotent_replay', true
    );
  END IF;

  IF v_old_status <> 'ready' OR v_rider_id IS NOT NULL THEN
    RAISE EXCEPTION 'order is not available to claim' USING ERRCODE = '55000';
  END IF;

  UPDATE public.orders
  SET
    rider_id = v_caller,
    status = 'out_for_delivery'::public.order_status,
    dispatched_at = COALESCE(dispatched_at, statement_timestamp())
  WHERE id = p_order_id;

  INSERT INTO public.order_events (
    order_id, event_type, old_status, new_status, metadata
  )
  VALUES (
    p_order_id,
    'ORDER_CLAIMED',
    v_old_status,
    'out_for_delivery',
    jsonb_build_object('actor_id', v_caller, 'actor_role', 'rider')
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'out_for_delivery',
    'idempotent_replay', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rider_mark_delivered(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_old_status public.order_status;
  v_rider_id UUID;
BEGIN
  IF v_caller IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_profiles AS up
    WHERE up.id = v_caller
      AND up.role = 'rider'::public.user_role
  ) THEN
    RAISE EXCEPTION 'rider role required' USING ERRCODE = '42501';
  END IF;

  SELECT o.status, o.rider_id
  INTO v_old_status, v_rider_id
  FROM public.orders AS o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_old_status = 'delivered' AND v_rider_id = v_caller THEN
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'status', v_old_status,
      'idempotent_replay', true
    );
  END IF;

  IF v_old_status <> 'out_for_delivery' OR v_rider_id <> v_caller THEN
    RAISE EXCEPTION 'order is not assigned to this rider' USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
  SET
    status = 'delivered'::public.order_status,
    actual_delivery_time = COALESCE(
      actual_delivery_time, statement_timestamp()
    )
  WHERE id = p_order_id;

  INSERT INTO public.order_events (
    order_id, event_type, old_status, new_status, metadata
  )
  VALUES (
    p_order_id,
    'ORDER_DELIVERED',
    v_old_status,
    'delivered',
    jsonb_build_object('actor_id', v_caller, 'actor_role', 'rider')
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'delivered',
    'idempotent_replay', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vendor_update_order_status(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rider_claim_order(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rider_mark_delivered(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_update_order_status(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_claim_order(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_mark_delivered(UUID)
  TO authenticated;

COMMENT ON FUNCTION public.admin_update_order_status(UUID, TEXT) IS
  'Authenticated admin order transition RPC; legacy enum overload removed.';
COMMENT ON FUNCTION public.vendor_update_order_status(UUID, TEXT) IS
  'Authenticated vendor/admin transition RPC with restaurant ownership checks.';
COMMENT ON FUNCTION public.rider_claim_order(UUID) IS
  'Authenticated rider claim RPC with row locking and idempotent replay.';
COMMENT ON FUNCTION public.rider_mark_delivered(UUID) IS
  'Authenticated assigned-rider delivery RPC with idempotent replay.';

-- Production uses auth.users for restaurants.owner_id while fresh databases
-- use user_profiles ON DELETE SET NULL. Both contain the same compatible owner
-- identities today. Replacing the Production FK is not required for the COD
-- launch and is intentionally deferred to avoid a needless table lock.
DO $restaurant_drift_check$
DECLARE
  v_fk_definition TEXT;
  v_missing_profiles BIGINT;
BEGIN
  IF to_regclass('public.restaurants') IS NULL
     OR to_regclass('public.user_profiles') IS NULL THEN
    RAISE EXCEPTION
      'required restaurant/profile relations are missing';
  END IF;

  SELECT pg_get_constraintdef(c.oid)
  INTO v_fk_definition
  FROM pg_constraint AS c
  WHERE c.conrelid = 'public.restaurants'::regclass
    AND c.contype = 'f'
    AND c.conkey = ARRAY[
      (
        SELECT a.attnum
        FROM pg_attribute AS a
        WHERE a.attrelid = 'public.restaurants'::regclass
          AND a.attname = 'owner_id'
      )
    ]::SMALLINT[]
  LIMIT 1;

  IF v_fk_definition IS NULL OR NOT (
    v_fk_definition LIKE 'FOREIGN KEY (owner_id) REFERENCES auth.users(id)%'
    OR v_fk_definition LIKE
      'FOREIGN KEY (owner_id) REFERENCES user_profiles(id)%'
  ) THEN
    RAISE EXCEPTION
      'unsupported restaurants.owner_id foreign key: %',
      COALESCE(v_fk_definition, '<missing>');
  END IF;

  SELECT count(*)
  INTO v_missing_profiles
  FROM public.restaurants AS r
  LEFT JOIN public.user_profiles AS up ON up.id = r.owner_id
  WHERE r.owner_id IS NOT NULL
    AND up.id IS NULL;

  IF v_missing_profiles <> 0 THEN
    RAISE EXCEPTION
      'restaurants.owner_id has % owner(s) without user_profiles',
      v_missing_profiles;
  END IF;
END;
$restaurant_drift_check$;

UPDATE public.restaurants
SET is_active = true
WHERE is_active IS NULL;

UPDATE public.restaurants
SET is_open = true
WHERE is_open IS NULL;

ALTER TABLE public.restaurants
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_open SET DEFAULT true,
  ALTER COLUMN is_open SET NOT NULL;

-- Remove manually-created permissive policies before recreating one canonical
-- admin/vendor policy per operation. Public read policies are handled by the
-- following anonymous-surface migration.
DROP POLICY IF EXISTS "Admin full access restaurants"
  ON public.restaurants;
DROP POLICY IF EXISTS "Vendor manage own restaurant"
  ON public.restaurants;
DROP POLICY IF EXISTS "Admin full access menu"
  ON public.menu_items;
DROP POLICY IF EXISTS "Vendor manage own menu"
  ON public.menu_items;

DROP POLICY IF EXISTS "admins_manage_restaurants"
  ON public.restaurants;
CREATE POLICY "admins_manage_restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "vendors_update_owned_restaurants"
  ON public.restaurants;
CREATE POLICY "vendors_update_owned_restaurants"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles AS up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'vendor'::public.user_role
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles AS up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'vendor'::public.user_role
    )
  );

DROP POLICY IF EXISTS "admins_manage_menu_items"
  ON public.menu_items;
CREATE POLICY "admins_manage_menu_items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "vendors_manage_owned_menu_items"
  ON public.menu_items;
CREATE POLICY "vendors_manage_owned_menu_items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      JOIN public.user_profiles AS up
        ON up.id = (SELECT auth.uid())
      WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = (SELECT auth.uid())
        AND up.role = 'vendor'::public.user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      JOIN public.user_profiles AS up
        ON up.id = (SELECT auth.uid())
      WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = (SELECT auth.uid())
        AND up.role = 'vendor'::public.user_role
    )
  );
