BEGIN;

CREATE TEMP TABLE operational_gate_results (
  test_no INTEGER PRIMARY KEY,
  assertion TEXT NOT NULL,
  passed BOOLEAN NOT NULL
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.record_operational_result(
  p_test_no INTEGER,
  p_assertion TEXT,
  p_passed BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, pg_catalog
AS $$
BEGIN
  INSERT INTO operational_gate_results(test_no, assertion, passed)
  VALUES (p_test_no, p_assertion, COALESCE(p_passed, false));
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.expect_operational_error(
  p_test_no INTEGER,
  p_assertion TEXT,
  p_sql TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    PERFORM pg_temp.record_operational_result(
      p_test_no, p_assertion, false
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.record_operational_result(
      p_test_no, p_assertion, true
    );
  END;
END;
$$;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  created_at, updated_at, raw_user_meta_data, raw_app_meta_data
) VALUES
  ('61000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ops-student@example.invalid', '', now(), now(), '{}', '{}'),
  ('61000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ops-admin@example.invalid', '', now(), now(), '{}', '{}'),
  ('61000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ops-vendor@example.invalid', '', now(), now(), '{}', '{}'),
  ('61000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ops-other-vendor@example.invalid', '', now(), now(), '{}', '{}'),
  ('61000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ops-rider@example.invalid', '', now(), now(), '{}', '{}'),
  ('61000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000000', 'authenticated',
   'authenticated', 'ops-other-rider@example.invalid', '', now(), now(), '{}', '{}');

UPDATE public.user_profiles
SET role = CASE id
  WHEN '61000000-0000-0000-0000-000000000002' THEN 'admin'::public.user_role
  WHEN '61000000-0000-0000-0000-000000000003' THEN 'vendor'::public.user_role
  WHEN '61000000-0000-0000-0000-000000000004' THEN 'vendor'::public.user_role
  WHEN '61000000-0000-0000-0000-000000000005' THEN 'rider'::public.user_role
  WHEN '61000000-0000-0000-0000-000000000006' THEN 'rider'::public.user_role
  ELSE role
END
WHERE id BETWEEN
  '61000000-0000-0000-0000-000000000002'
  AND '61000000-0000-0000-0000-000000000006';

INSERT INTO public.restaurants (
  id, name, slug, owner_id, is_available
) VALUES
  ('62000000-0000-0000-0000-000000000001',
   'Ops Vendor Restaurant', 'ops-vendor-restaurant',
   '61000000-0000-0000-0000-000000000003', true),
  ('62000000-0000-0000-0000-000000000002',
   'Ops Other Restaurant', 'ops-other-restaurant',
   '61000000-0000-0000-0000-000000000004', true);

INSERT INTO public.orders (
  id, user_id, restaurant_id, order_number, order_type, status,
  total_amount, final_amount, payment_method
) VALUES
  ('63000000-0000-0000-0000-000000000001',
   '61000000-0000-0000-0000-000000000001',
   '62000000-0000-0000-0000-000000000001',
   'OPS-OWNED', 'food', 'pending', 100, 100, 'cod'),
  ('63000000-0000-0000-0000-000000000002',
   '61000000-0000-0000-0000-000000000001',
   '62000000-0000-0000-0000-000000000002',
   'OPS-OTHER', 'food', 'pending', 100, 100, 'cod');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true
);
SELECT pg_temp.expect_operational_error(
  1, 'student cannot use admin transition RPC',
  $$SELECT public.admin_update_order_status(
    '63000000-0000-0000-0000-000000000001', 'confirmed')$$
);
SELECT pg_temp.expect_operational_error(
  2, 'student cannot use vendor transition RPC',
  $$SELECT public.vendor_update_order_status(
    '63000000-0000-0000-0000-000000000001', 'confirmed')$$
);
SELECT pg_temp.expect_operational_error(
  3, 'student cannot claim an order',
  $$SELECT public.rider_claim_order(
    '63000000-0000-0000-0000-000000000001')$$
);

SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000003', true
);
SELECT pg_temp.expect_operational_error(
  4, 'vendor cannot update another restaurant order',
  $$SELECT public.vendor_update_order_status(
    '63000000-0000-0000-0000-000000000002', 'confirmed')$$
);
SELECT public.vendor_update_order_status(
  '63000000-0000-0000-0000-000000000001', 'confirmed'
);
SELECT public.vendor_update_order_status(
  '63000000-0000-0000-0000-000000000001', 'confirmed'
);
RESET ROLE;
SELECT pg_temp.record_operational_result(
  5, 'vendor transition is scoped and replay-safe',
  (SELECT status = 'confirmed' FROM public.orders
   WHERE id = '63000000-0000-0000-0000-000000000001')
  AND (SELECT count(*) = 1 FROM public.order_events
       WHERE order_id = '63000000-0000-0000-0000-000000000001'
         AND old_status = 'pending'
         AND new_status = 'confirmed')
);
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000003', true
);
SELECT pg_temp.expect_operational_error(
  6, 'vendor cannot skip preparing',
  $$SELECT public.vendor_update_order_status(
    '63000000-0000-0000-0000-000000000001', 'ready')$$
);
SELECT public.vendor_update_order_status(
  '63000000-0000-0000-0000-000000000001', 'preparing'
);
SELECT public.vendor_update_order_status(
  '63000000-0000-0000-0000-000000000001', 'ready'
);

SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000006', true
);
SELECT pg_temp.expect_operational_error(
  7, 'unassigned rider cannot deliver',
  $$SELECT public.rider_mark_delivered(
    '63000000-0000-0000-0000-000000000001')$$
);

SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000005', true
);
SELECT public.rider_claim_order(
  '63000000-0000-0000-0000-000000000001'
);
SELECT public.rider_claim_order(
  '63000000-0000-0000-0000-000000000001'
);
SELECT pg_temp.record_operational_result(
  8, 'rider claim assigns exactly once and is replay-safe',
  (SELECT status = 'out_for_delivery'
          AND rider_id = '61000000-0000-0000-0000-000000000005'
   FROM public.orders
   WHERE id = '63000000-0000-0000-0000-000000000001')
  AND (SELECT count(*) = 1 FROM public.order_events
       WHERE order_id = '63000000-0000-0000-0000-000000000001'
         AND event_type = 'ORDER_CLAIMED')
);

SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000006', true
);
SELECT pg_temp.expect_operational_error(
  9, 'different rider cannot steal or deliver claimed order',
  $$SELECT public.rider_mark_delivered(
    '63000000-0000-0000-0000-000000000001')$$
);

SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000005', true
);
SELECT public.rider_mark_delivered(
  '63000000-0000-0000-0000-000000000001'
);
SELECT public.rider_mark_delivered(
  '63000000-0000-0000-0000-000000000001'
);
SELECT pg_temp.record_operational_result(
  10, 'assigned rider delivery is replay-safe and audited once',
  (SELECT status = 'delivered'
          AND actual_delivery_time IS NOT NULL
   FROM public.orders
   WHERE id = '63000000-0000-0000-0000-000000000001')
  AND (SELECT count(*) = 1 FROM public.order_events
       WHERE order_id = '63000000-0000-0000-0000-000000000001'
         AND event_type = 'ORDER_DELIVERED')
);

SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000002', true
);
SELECT public.admin_update_order_status(
  '63000000-0000-0000-0000-000000000002', 'confirmed'
);
SELECT public.admin_update_order_status(
  '63000000-0000-0000-0000-000000000002', 'confirmed'
);
RESET ROLE;
SELECT pg_temp.record_operational_result(
  11, 'admin transition is authorized and replay-safe',
  (SELECT status = 'confirmed' FROM public.orders
   WHERE id = '63000000-0000-0000-0000-000000000002')
  AND (SELECT count(*) = 1 FROM public.order_events
       WHERE order_id = '63000000-0000-0000-0000-000000000002'
         AND old_status = 'pending'
         AND new_status = 'confirmed')
);
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '61000000-0000-0000-0000-000000000002', true
);
SELECT pg_temp.expect_operational_error(
  12, 'admin cannot perform a backward transition',
  $$SELECT public.admin_update_order_status(
    '63000000-0000-0000-0000-000000000002', 'pending')$$
);
SELECT public.admin_update_order_status(
  '63000000-0000-0000-0000-000000000002', 'preparing'
);
SELECT public.admin_update_order_status(
  '63000000-0000-0000-0000-000000000002', 'ready'
);
SELECT pg_temp.expect_operational_error(
  13, 'admin cannot dispatch an order without an assigned rider',
  $$SELECT public.admin_update_order_status(
    '63000000-0000-0000-0000-000000000002', 'out_for_delivery')$$
);

RESET ROLE;
SELECT pg_temp.record_operational_result(
  14, 'RPC signatures and client grants match application calls',
  to_regprocedure(
    'public.admin_update_order_status(uuid,text)'
  ) IS NOT NULL
  AND to_regprocedure(
    'public.vendor_update_order_status(uuid,text)'
  ) IS NOT NULL
  AND to_regprocedure('public.rider_claim_order(uuid)') IS NOT NULL
  AND to_regprocedure('public.rider_mark_delivered(uuid)') IS NOT NULL
  AND has_function_privilege(
    'authenticated',
    'public.admin_update_order_status(uuid,text)', 'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'public.vendor_update_order_status(uuid,text)', 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.admin_update_order_status(uuid,text)', 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.vendor_update_order_status(uuid,text)', 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon', 'public.rider_claim_order(uuid)', 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon', 'public.rider_mark_delivered(uuid)', 'EXECUTE'
  )
);
SELECT pg_temp.record_operational_result(
  15, 'COD lifecycle has no wallet or payment side effects',
  NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE reference_id IN (
      '63000000-0000-0000-0000-000000000001',
      '63000000-0000-0000-0000-000000000002'
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE order_id IN (
      '63000000-0000-0000-0000-000000000001',
      '63000000-0000-0000-0000-000000000002'
    )
  )
);

DO $report$
DECLARE
  v_result RECORD;
  v_failed INTEGER;
BEGIN
  FOR v_result IN
    SELECT * FROM operational_gate_results ORDER BY test_no
  LOOP
    RAISE NOTICE '% | % | %',
      v_result.test_no,
      CASE WHEN v_result.passed THEN 'PASS' ELSE 'FAIL' END,
      v_result.assertion;
  END LOOP;

  SELECT count(*) FILTER (WHERE NOT passed)
  INTO v_failed
  FROM operational_gate_results;

  RAISE NOTICE 'OPERATIONAL RPC GATE SUMMARY: % PASS, % FAIL, 15 TOTAL',
    15 - v_failed, v_failed;

  IF (SELECT count(*) FROM operational_gate_results) <> 15 THEN
    RAISE EXCEPTION 'operational RPC gate incomplete';
  END IF;

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'operational RPC gate failed: % failure(s)', v_failed;
  END IF;
END;
$report$;

ROLLBACK;
