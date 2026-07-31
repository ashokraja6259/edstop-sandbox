\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE order_items_runtime_results (
  test_no INTEGER PRIMARY KEY,
  assertion TEXT NOT NULL,
  passed BOOLEAN NOT NULL
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.assert_order_item_runtime(
  p_test_no INTEGER,
  p_assertion TEXT,
  p_condition BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO order_items_runtime_results
  VALUES (p_test_no, p_assertion, COALESCE(p_condition, FALSE));
END;
$$;

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'order-items-runtime@example.invalid',
  '',
  now(),
  now(),
  '{"full_name":"Order Items Runtime"}',
  '{}'
);

CREATE TEMP TABLE runtime_catalog AS
SELECT
  r.id AS restaurant_id,
  m.id AS menu_item_id,
  m.price
FROM public.restaurants AS r
JOIN public.menu_items AS m ON m.restaurant_id = r.id
WHERE r.slug = 'spice-garden'
  AND r.is_available = TRUE
  AND r.is_active = TRUE
  AND r.is_open = TRUE
  AND m.is_available = TRUE
ORDER BY m.external_id
LIMIT 1;

DO $catalog$
BEGIN
  IF (SELECT count(*) FROM runtime_catalog) <> 1 THEN
    RAISE EXCEPTION 'fresh migration catalog fixture is missing';
  END IF;
END;
$catalog$;

SELECT set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001',
  TRUE
);

CREATE TEMP TABLE food_first AS
SELECT public.create_order_atomic(
  'a1000000-0000-0000-0000-000000000001',
  (SELECT restaurant_id FROM runtime_catalog),
  'cod',
  jsonb_build_array(
    jsonb_build_object(
      'id', (SELECT menu_item_id FROM runtime_catalog),
      'quantity', 1
    )
  ),
  0,
  NULL,
  'order-items-food-runtime'
) AS result;

CREATE TEMP TABLE food_replay AS
SELECT public.create_order_atomic(
  'a1000000-0000-0000-0000-000000000001',
  (SELECT restaurant_id FROM runtime_catalog),
  'cod',
  jsonb_build_array(
    jsonb_build_object(
      'id', (SELECT menu_item_id FROM runtime_catalog),
      'quantity', 1
    )
  ),
  0,
  NULL,
  'order-items-food-runtime'
) AS result;

CREATE TEMP TABLE store_first AS
SELECT public.create_dark_store_cod_order(
  'a1000000-0000-0000-0000-000000000001',
  '[{"id":"p1","name":"Store Runtime Item","quantity":2,"price":20,"totalPrice":40}]',
  40,
  0,
  0,
  NULL,
  'order-items-store-runtime'
) AS result;

CREATE TEMP TABLE store_replay AS
SELECT public.create_dark_store_cod_order(
  'a1000000-0000-0000-0000-000000000001',
  '[{"id":"p1","name":"Store Runtime Item","quantity":2,"price":20,"totalPrice":40}]',
  40,
  0,
  0,
  NULL,
  'order-items-store-runtime'
) AS result;

SELECT pg_temp.assert_order_item_runtime(
  1,
  'food COD creates exactly one order',
  (SELECT count(*) = 1
   FROM public.orders
   WHERE user_id = 'a1000000-0000-0000-0000-000000000001'
     AND checkout_idempotency_key = 'order-items-food-runtime')
);

SELECT pg_temp.assert_order_item_runtime(
  2,
  'food COD replay returns the original order',
  (SELECT result->>'idempotent_replay' = 'true' FROM food_replay)
  AND (SELECT food_first.result->>'order_id' = food_replay.result->>'order_id'
       FROM food_first CROSS JOIN food_replay)
);

SELECT pg_temp.assert_order_item_runtime(
  3,
  'food COD creates one canonical menu item row',
  (SELECT count(*) = 1
          AND count(*) FILTER (
            WHERE menu_item_id = (SELECT menu_item_id FROM runtime_catalog)
              AND item_id IS NULL
          ) = 1
   FROM public.order_items
   WHERE order_id = (
     SELECT (result->>'order_id')::UUID FROM food_first
   ))
);

SELECT pg_temp.assert_order_item_runtime(
  4,
  'food COD creates one order-created event',
  (SELECT count(*) = 1
   FROM public.order_events
   WHERE order_id = (
     SELECT (result->>'order_id')::UUID FROM food_first
   )
     AND event_type = 'ORDER_CREATED')
);

SELECT pg_temp.assert_order_item_runtime(
  5,
  'dark-store COD creates exactly one order',
  (SELECT count(*) = 1
   FROM public.orders
   WHERE user_id = 'a1000000-0000-0000-0000-000000000001'
     AND checkout_idempotency_key = 'order-items-store-runtime')
);

SELECT pg_temp.assert_order_item_runtime(
  6,
  'dark-store COD replay returns the original order',
  (SELECT result->>'idempotent_replay' = 'true' FROM store_replay)
  AND (SELECT store_first.result->>'order_id' = store_replay.result->>'order_id'
       FROM store_first CROSS JOIN store_replay)
);

SELECT pg_temp.assert_order_item_runtime(
  7,
  'dark-store COD creates one polymorphic item row',
  (SELECT count(*) = 1
          AND min(item_id) = 'p1'
          AND count(menu_item_id) = 0
   FROM public.order_items
   WHERE order_id = (
     SELECT (result->>'order_id')::UUID FROM store_first
   ))
);

SELECT pg_temp.assert_order_item_runtime(
  8,
  'dark-store COD creates one order-created event',
  (SELECT count(*) = 1
   FROM public.order_events
   WHERE order_id = (
     SELECT (result->>'order_id')::UUID FROM store_first
   )
     AND event_type = 'ORDER_CREATED')
);

SELECT pg_temp.assert_order_item_runtime(
  9,
  'COD runtime paths create no wallet ledger side effect',
  NOT EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE user_id = 'a1000000-0000-0000-0000-000000000001'
  )
);

SELECT pg_temp.assert_order_item_runtime(
  10,
  'COD runtime paths create no payment intent',
  NOT EXISTS (
    SELECT 1
    FROM public.payment_intents
    WHERE user_id = 'a1000000-0000-0000-0000-000000000001'
  )
);

DO $report$
DECLARE
  v_result RECORD;
  v_failed INTEGER;
BEGIN
  FOR v_result IN
    SELECT * FROM order_items_runtime_results ORDER BY test_no
  LOOP
    RAISE NOTICE '% | % | %',
      v_result.test_no,
      CASE WHEN v_result.passed THEN 'PASS' ELSE 'FAIL' END,
      v_result.assertion;
  END LOOP;

  IF (SELECT count(*) FROM order_items_runtime_results) <> 10 THEN
    RAISE EXCEPTION 'order_items runtime gate incomplete';
  END IF;

  SELECT count(*)
  INTO v_failed
  FROM order_items_runtime_results
  WHERE NOT passed;

  IF v_failed > 0 THEN
    RAISE EXCEPTION
      'order_items runtime gate failed: % assertion(s)',
      v_failed;
  END IF;
END;
$report$;

ROLLBACK;
