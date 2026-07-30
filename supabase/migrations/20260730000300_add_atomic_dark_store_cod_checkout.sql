CREATE OR REPLACE FUNCTION public.create_dark_store_cod_order(
  p_user_id UUID,
  p_items JSONB,
  p_total_amount NUMERIC,
  p_delivery_fee NUMERIC,
  p_discount_amount NUMERIC,
  p_promo_code TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_final_amount NUMERIC(10, 2);
  v_item_subtotal NUMERIC(10, 2);
  v_inserted BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'invalid user';
  END IF;

  IF p_idempotency_key IS NULL
     OR LENGTH(TRIM(p_idempotency_key)) = 0
     OR LENGTH(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'invalid idempotency key';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'cart is empty';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items)
      AS item(id TEXT, name TEXT, quantity INTEGER, price NUMERIC, "totalPrice" NUMERIC)
    WHERE item.id IS NULL
       OR LENGTH(TRIM(item.id)) = 0
       OR item.name IS NULL
       OR LENGTH(TRIM(item.name)) = 0
       OR item.quantity IS NULL
       OR item.quantity <= 0
       OR item.price IS NULL
       OR item.price < 0
       OR item."totalPrice" IS NULL
       OR item."totalPrice" <> ROUND(item.price * item.quantity, 2)
  ) THEN
    RAISE EXCEPTION 'invalid cart item';
  END IF;

  SELECT COALESCE(SUM(item."totalPrice"), 0)
  INTO v_item_subtotal
  FROM jsonb_to_recordset(p_items)
    AS item(id TEXT, name TEXT, quantity INTEGER, price NUMERIC, "totalPrice" NUMERIC);

  IF p_total_amount < 0
     OR p_delivery_fee < 0
     OR p_discount_amount < 0
     OR ROUND(v_item_subtotal + p_delivery_fee, 2) <> ROUND(p_total_amount, 2)
     OR p_discount_amount > p_total_amount THEN
    RAISE EXCEPTION 'invalid order totals';
  END IF;

  v_final_amount := ROUND(p_total_amount - p_discount_amount, 2);
  v_order_number :=
    'DS'
    || FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT::TEXT
    || LPAD((FLOOR(RANDOM() * 1000))::INT::TEXT, 3, '0');

  INSERT INTO public.orders (
    user_id,
    order_number,
    order_type,
    status,
    total_amount,
    delivery_fee,
    tax_amount,
    discount_amount,
    promo_code,
    promo_discount,
    final_amount,
    payment_method,
    wallet_used,
    items,
    checkout_idempotency_key
  )
  VALUES (
    p_user_id,
    v_order_number,
    'store',
    'pending',
    p_total_amount,
    p_delivery_fee,
    0,
    p_discount_amount,
    NULLIF(TRIM(COALESCE(p_promo_code, '')), ''),
    p_discount_amount,
    v_final_amount,
    'cod',
    0,
    p_items,
    TRIM(p_idempotency_key)
  )
  ON CONFLICT (user_id, checkout_idempotency_key)
    WHERE checkout_idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id, order_number INTO v_order_id, v_order_number;

  IF v_order_id IS NULL THEN
    SELECT id, order_number
    INTO v_order_id, v_order_number
    FROM public.orders
    WHERE user_id = p_user_id
      AND checkout_idempotency_key = TRIM(p_idempotency_key);

    RETURN jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'idempotent_replay', true
    );
  END IF;

  v_inserted := true;

  INSERT INTO public.order_items (
    order_id,
    menu_item_id,
    item_id,
    item_name,
    quantity,
    price,
    total_price
  )
  SELECT
    v_order_id,
    NULL,
    item.id,
    item.name,
    item.quantity,
    item.price,
    item."totalPrice"
  FROM jsonb_to_recordset(p_items)
    AS item(id TEXT, name TEXT, quantity INTEGER, price NUMERIC, "totalPrice" NUMERIC);

  INSERT INTO public.order_events (
    order_id,
    event_type,
    old_status,
    new_status,
    metadata
  )
  VALUES (
    v_order_id,
    'ORDER_CREATED',
    NULL,
    'pending',
    jsonb_build_object(
      'payment_method', 'cod',
      'order_type', 'store'
    )
  );

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'idempotent_replay', NOT v_inserted
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_dark_store_cod_order(
  UUID, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_dark_store_cod_order(
  UUID, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT
) TO service_role;
