-- Add the operational order RPCs already called by the admin, vendor, and
-- rider applications. All mutations remain behind authenticated,
-- role-checked SECURITY DEFINER functions.

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

  SELECT o.status
  INTO v_old_status
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
