CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id UUID,
  p_restaurant_id UUID,
  p_payment_method TEXT,
  p_items JSONB,
  p_wallet_amount NUMERIC,
  p_promo_code TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user UUID;
  v_existing_order_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(10, 2) := 0;
  v_promo_discount NUMERIC(10, 2) := 0;
  v_wallet_requested NUMERIC(10, 2) := GREATEST(0, COALESCE(p_wallet_amount, 0));
  v_wallet_used NUMERIC(10, 2) := 0;
  v_final_amount NUMERIC(10, 2) := 0;
  v_wallet_balance NUMERIC(10, 2);
  v_new_balance NUMERIC(10, 2);
  v_promo RECORD;
  v_promo_id UUID := NULL;
  v_requested_item_count INTEGER := 0;
  v_valid_item_count INTEGER := 0;
  v_payment_method TEXT;
  v_idempotency_key TEXT;
BEGIN
  v_auth_user := auth.uid();

  IF v_auth_user IS NULL OR v_auth_user <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized checkout attempt';
  END IF;

  v_payment_method := LOWER(TRIM(COALESCE(p_payment_method, '')));
  IF v_payment_method NOT IN ('cod', 'razorpay', 'online', 'wallet') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS x(id UUID, quantity INTEGER)
    WHERE x.id IS NULL OR x.quantity IS NULL OR x.quantity <= 0
  ) THEN
    RAISE EXCEPTION 'Invalid item payload';
  END IF;

  PERFORM 1
  FROM public.restaurants
  WHERE id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid restaurant';
  END IF;

  v_idempotency_key := NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '');

  IF v_idempotency_key IS NOT NULL THEN
    SELECT id
    INTO v_existing_order_id
    FROM public.orders
    WHERE user_id = p_user_id
      AND checkout_idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'order_id', v_existing_order_id,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  CREATE TEMP TABLE tmp_checkout_items (
    menu_item_id UUID PRIMARY KEY,
    quantity INTEGER NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_checkout_items (menu_item_id, quantity)
  SELECT
    x.id,
    SUM(x.quantity)::INTEGER
  FROM jsonb_to_recordset(p_items) AS x(
    id UUID,
    quantity INTEGER
  )
  GROUP BY x.id;

  SELECT COUNT(*)
  INTO v_requested_item_count
  FROM tmp_checkout_items;

  IF v_requested_item_count = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  SELECT COUNT(*)
  INTO v_valid_item_count
  FROM tmp_checkout_items t
  JOIN public.menu_items m
    ON m.id = t.menu_item_id
  WHERE m.restaurant_id = p_restaurant_id
    AND m.is_available = true;

  IF v_valid_item_count <> v_requested_item_count THEN
    RAISE EXCEPTION 'One or more items are invalid for this restaurant';
  END IF;

  SELECT COALESCE(SUM(ROUND((m.price * t.quantity)::NUMERIC, 2)), 0)
  INTO v_subtotal
  FROM tmp_checkout_items t
  JOIN public.menu_items m
    ON m.id = t.menu_item_id
  WHERE m.restaurant_id = p_restaurant_id
    AND m.is_available = true;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'Invalid order amount';
  END IF;

  IF p_promo_code IS NOT NULL AND LENGTH(TRIM(p_promo_code)) > 0 THEN
    SELECT *
    INTO v_promo
    FROM public.promo_codes
    WHERE UPPER(code) = UPPER(TRIM(p_promo_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit)
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid promo code';
    END IF;

    IF v_subtotal < COALESCE(v_promo.min_order_amount, 0) THEN
      RAISE EXCEPTION 'Order does not meet promo minimum amount';
    END IF;

    IF v_promo.discount_type = 'flat' THEN
      v_promo_discount := LEAST(v_subtotal, COALESCE(v_promo.discount_value, 0));
    ELSE
      v_promo_discount := ROUND((v_subtotal * COALESCE(v_promo.discount_value, 0) / 100)::NUMERIC, 2);
      IF v_promo.max_discount_amount IS NOT NULL THEN
        v_promo_discount := LEAST(v_promo_discount, v_promo.max_discount_amount);
      END IF;
    END IF;

    v_promo_discount := GREATEST(0, COALESCE(v_promo_discount, 0));
    v_promo_id := v_promo.id;
  END IF;

  IF v_wallet_requested > 0 THEN
    SELECT balance
    INTO v_wallet_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_balance IS NULL THEN
      RAISE EXCEPTION 'Wallet not found';
    END IF;

    v_wallet_used := LEAST(v_wallet_requested, GREATEST(0, v_subtotal - v_promo_discount));

    IF v_wallet_balance < v_wallet_used THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;

    v_new_balance := v_wallet_balance - v_wallet_used;
  END IF;

  v_final_amount := GREATEST(0, v_subtotal - v_promo_discount - v_wallet_used);
  v_order_number := 'ED' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || LPAD((FLOOR(RANDOM() * 1000))::INT::TEXT, 3, '0');

  INSERT INTO public.orders (
    user_id,
    restaurant_id,
    order_number,
    order_type,
    status,
    total_amount,
    discount_amount,
    promo_code,
    promo_discount,
    final_amount,
    payment_method,
    wallet_used,
    checkout_idempotency_key
  )
  VALUES (
    p_user_id,
    p_restaurant_id,
    v_order_number,
    'food',
    'pending',
    v_subtotal,
    v_promo_discount,
    NULLIF(TRIM(COALESCE(p_promo_code, '')), ''),
    v_promo_discount,
    v_final_amount,
    v_payment_method,
    v_wallet_used,
    v_idempotency_key
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    menu_item_id,
    item_name,
    quantity,
    price,
    total_price
  )
  SELECT
    v_order_id,
    m.id,
    m.name,
    t.quantity,
    m.price,
    ROUND((m.price * t.quantity)::NUMERIC, 2)
  FROM tmp_checkout_items t
  JOIN public.menu_items m
    ON m.id = t.menu_item_id
  WHERE m.restaurant_id = p_restaurant_id
    AND m.is_available = true;

  IF v_wallet_used > 0 THEN
    UPDATE public.wallets
    SET balance = v_new_balance
    WHERE user_id = p_user_id;

    INSERT INTO public.wallet_transactions (
      user_id,
      amount,
      type,
      reference_id,
      description
    )
    VALUES (
      p_user_id,
      -v_wallet_used,
      'order_payment',
      v_order_id,
      'Wallet used for order ' || v_order_number
    );
  END IF;

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
      'payment_method', v_payment_method,
      'wallet_used', v_wallet_used
    )
  );

  IF v_promo_id IS NOT NULL THEN
    UPDATE public.promo_codes
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = v_promo_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'idempotent_replay', false
  );
END;
$$;