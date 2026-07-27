BEGIN;

CREATE TEMP TABLE razorpay_gate_results (
  test_no INTEGER PRIMARY KEY,
  assertion TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  detail TEXT
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.assert_payment(
  p_test_no INTEGER,
  p_assertion TEXT,
  p_condition BOOLEAN,
  p_detail TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO razorpay_gate_results
  VALUES (p_test_no, p_assertion, COALESCE(p_condition, FALSE), p_detail);
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.expect_payment_error(
  p_test_no INTEGER,
  p_assertion TEXT,
  p_sql TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    PERFORM pg_temp.assert_payment(
      p_test_no, p_assertion, FALSE, 'operation unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.assert_payment(
      p_test_no, p_assertion, TRUE, format('[%s] %s', SQLSTATE, SQLERRM)
    );
  END;
END;
$$;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  created_at, updated_at, raw_user_meta_data, raw_app_meta_data
) VALUES
  ('81000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'razorpay-gate@example.invalid', '',
   now(), now(), '{"full_name":"Razorpay Gate"}', '{}'),
  ('81000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'razorpay-other@example.invalid', '',
   now(), now(), '{"full_name":"Razorpay Other"}', '{}');

UPDATE public.wallets
SET balance = 50
WHERE user_id = '81000000-0000-0000-0000-000000000001';

INSERT INTO public.payment_intents (
  id, user_id, provider, provider_order_id, order_type,
  amount_paise, currency, items, status, idempotency_key, receipt,
  item_subtotal_paise, tax_amount_paise, fee_amount_paise,
  discount_amount_paise, wallet_amount_paise, razorpay_amount_paise,
  total_amount_paise, environment_mode, expires_at
) VALUES (
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'razorpay', 'order_gate_1', 'store',
  8000, 'INR',
  '[{"id":"p1","name":"Gate Item","quantity":2,"pricePaise":5000,"totalPricePaise":10000}]',
  'razorpay_order_created', 'gate-attempt-1', 'ds_gate_1',
  10000, 0, 0, 0, 2000, 8000, 10000, 'test',
  now() + INTERVAL '30 minutes'
);

CREATE TEMP TABLE finalized_result AS
SELECT public.finalize_razorpay_payment(
  '82000000-0000-0000-0000-000000000001',
  'pay_gate_1',
  8000,
  'INR',
  '{"source":"sql_gate","status":"captured"}'
) AS result;

SELECT pg_temp.assert_payment(
  1, 'valid captured payment creates an order',
  (SELECT result ? 'order_id' FROM finalized_result)
);
SELECT pg_temp.assert_payment(
  2, 'intent reaches order_created and links exactly one order',
  (SELECT status = 'order_created' AND internal_order_id IS NOT NULL
   FROM public.payment_intents
   WHERE id = '82000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_payment(
  3, 'wallet is deducted exactly once',
  (SELECT balance = 30 FROM public.wallets
   WHERE user_id = '81000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_payment(
  4, 'wallet ledger has one exact debit',
  (SELECT count(*) = 1 AND min(amount) = -20
   FROM public.wallet_transactions
   WHERE metadata->>'payment_intent_id'
     = '82000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_payment(
  5, 'order items are created atomically',
  (SELECT count(*) = 1 AND min(quantity) = 2 AND min(total_price) = 100
   FROM public.order_items
   WHERE order_id = (
     SELECT internal_order_id FROM public.payment_intents
     WHERE id = '82000000-0000-0000-0000-000000000001'
   ))
);
SELECT pg_temp.assert_payment(
  6, 'order event is created atomically',
  (SELECT count(*) = 1 FROM public.order_events
   WHERE order_id = (
     SELECT internal_order_id FROM public.payment_intents
     WHERE id = '82000000-0000-0000-0000-000000000001'
   ) AND event_type = 'ORDER_CREATED')
);

CREATE TEMP TABLE replay_result AS
SELECT public.finalize_razorpay_payment(
  '82000000-0000-0000-0000-000000000001',
  'pay_gate_1',
  8000,
  'INR',
  '{"source":"sql_gate_replay"}'
) AS result;

SELECT pg_temp.assert_payment(
  7, 'duplicate finalization is idempotent',
  (SELECT result->>'idempotent_replay' = 'true' FROM replay_result)
);
SELECT pg_temp.assert_payment(
  8, 'duplicate finalization creates no second order or debit',
  (SELECT count(*) = 1 FROM public.orders WHERE payment_id = 'pay_gate_1')
  AND (SELECT balance = 30 FROM public.wallets
       WHERE user_id = '81000000-0000-0000-0000-000000000001')
  AND (SELECT count(*) = 1 FROM public.wallet_transactions
       WHERE metadata->>'payment_intent_id'
         = '82000000-0000-0000-0000-000000000001')
);

INSERT INTO public.payment_intents (
  id, user_id, provider, provider_order_id, order_type,
  amount_paise, currency, items, status, idempotency_key, receipt,
  item_subtotal_paise, tax_amount_paise, fee_amount_paise,
  discount_amount_paise, wallet_amount_paise, razorpay_amount_paise,
  total_amount_paise, environment_mode, expires_at
) VALUES (
  '82000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000001',
  'razorpay', 'order_gate_2', 'store',
  1000, 'INR',
  '[{"id":"p2","name":"Bad Amount Item","quantity":1,"pricePaise":1000,"totalPricePaise":1000}]',
  'razorpay_order_created', 'gate-attempt-2', 'ds_gate_2',
  1000, 0, 0, 0, 0, 1000, 1000, 'test',
  now() + INTERVAL '30 minutes'
);

SELECT pg_temp.expect_payment_error(
  9, 'wrong provider amount is rejected',
  $$SELECT public.finalize_razorpay_payment(
    '82000000-0000-0000-0000-000000000002',
    'pay_gate_2', 999, 'INR', '{}'
  )$$
);
SELECT pg_temp.expect_payment_error(
  10, 'wrong provider currency is rejected',
  $$SELECT public.finalize_razorpay_payment(
    '82000000-0000-0000-0000-000000000002',
    'pay_gate_2', 1000, 'USD', '{}'
  )$$
);
SELECT pg_temp.assert_payment(
  11, 'failed verification leaves wallet, order and intent unchanged',
  (SELECT balance = 30 FROM public.wallets
   WHERE user_id = '81000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.orders WHERE payment_id = 'pay_gate_2')
  AND (SELECT status = 'razorpay_order_created'
       FROM public.payment_intents
       WHERE id = '82000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.expect_payment_error(
  12, 'provider payment ID cannot be consumed by another intent',
  $$UPDATE public.payment_intents
    SET provider_payment_id = 'pay_gate_1'
    WHERE id = '82000000-0000-0000-0000-000000000002'$$
);
SELECT pg_temp.expect_payment_error(
  13, 'illegal backward state transition is rejected',
  $$UPDATE public.payment_intents
    SET status = 'created'
    WHERE id = '82000000-0000-0000-0000-000000000001'$$
);

CREATE TEMP TABLE refund_reservation AS
SELECT public.reserve_razorpay_refund(
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'refund-gate-1',
  3000
) AS result;

SELECT pg_temp.assert_payment(
  14, 'partial refund reservation is recorded',
  (SELECT result->>'amount_paise' = '3000' FROM refund_reservation)
  AND (SELECT status = 'refund_pending'
       FROM public.payment_intents
       WHERE id = '82000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_payment(
  15, 'duplicate refund reservation is idempotent',
  (SELECT public.reserve_razorpay_refund(
    '82000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'refund-gate-1',
    3000
  )->>'idempotent_replay' = 'true')
);

UPDATE public.payment_refunds
SET status = 'processed', completed_at = now()
WHERE payment_intent_id = '82000000-0000-0000-0000-000000000001';
UPDATE public.payment_intents
SET status = 'partially_refunded'
WHERE id = '82000000-0000-0000-0000-000000000001';

SELECT pg_temp.expect_payment_error(
  16, 'over-refund reservation is rejected atomically',
  $$SELECT public.reserve_razorpay_refund(
    '82000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'refund-gate-over',
    6000
  )$$
);
SELECT pg_temp.assert_payment(
  17, 'over-refund rejection preserves prior refund total',
  (SELECT sum(amount_paise) = 3000 FROM public.payment_refunds
   WHERE payment_intent_id = '82000000-0000-0000-0000-000000000001')
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '81000000-0000-0000-0000-000000000001',
  true
);

SELECT pg_temp.assert_payment(
  18, 'owner can read only their payment intent',
  (SELECT count(*) = 2 FROM public.payment_intents)
);
SELECT pg_temp.assert_payment(
  19, 'authenticated clients cannot mutate payment intents or call finalizer',
  NOT has_table_privilege(
    'authenticated', 'public.payment_intents', 'INSERT,UPDATE,DELETE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.finalize_razorpay_payment(uuid,text,bigint,text,jsonb)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.reserve_razorpay_refund(uuid,uuid,text,bigint)',
    'EXECUTE'
  )
);
SELECT pg_temp.assert_payment(
  20, 'anon and PUBLIC have no payment lifecycle write authority',
  NOT has_table_privilege(
    'anon', 'public.payment_intents', 'SELECT,INSERT,UPDATE,DELETE'
  )
  AND NOT has_table_privilege(
    'anon', 'public.payment_refunds', 'SELECT,INSERT,UPDATE,DELETE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.finalize_razorpay_payment(uuid,text,bigint,text,jsonb)',
    'EXECUTE'
  )
);

RESET ROLE;

DO $report$
DECLARE
  v_result RECORD;
  v_failed INTEGER;
BEGIN
  FOR v_result IN SELECT * FROM razorpay_gate_results ORDER BY test_no LOOP
    RAISE NOTICE '% | % | % | %',
      v_result.test_no,
      CASE WHEN v_result.passed THEN 'PASS' ELSE 'FAIL' END,
      v_result.assertion,
      COALESCE(v_result.detail, '');
  END LOOP;

  IF (SELECT count(*) FROM razorpay_gate_results) <> 20 THEN
    RAISE EXCEPTION 'Razorpay gate incomplete';
  END IF;

  SELECT count(*) INTO v_failed
  FROM razorpay_gate_results WHERE NOT passed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION 'Razorpay gate failed: % assertion(s)', v_failed;
  END IF;
END;
$report$;

ROLLBACK;
