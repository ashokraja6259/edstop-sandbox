-- Prevent even an admin from moving an unassigned order into rider-owned
-- statuses. Rider assignment remains atomic through rider_claim_order().

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

REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT)
  TO authenticated;
