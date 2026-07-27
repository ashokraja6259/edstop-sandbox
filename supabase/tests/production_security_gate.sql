BEGIN;

CREATE TEMP TABLE security_gate_results (
  test_no integer PRIMARY KEY,
  assertion text NOT NULL,
  passed boolean NOT NULL,
  detail text
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.record_result(
  p_test_no integer,
  p_assertion text,
  p_passed boolean,
  p_detail text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, pg_catalog
AS $$
BEGIN
  INSERT INTO security_gate_results(test_no, assertion, passed, detail)
  VALUES (p_test_no, p_assertion, COALESCE(p_passed, false), p_detail);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Result collector failed for test %: %', p_test_no, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.expect_error(
  p_test_no integer,
  p_assertion text,
  p_sql text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    PERFORM pg_temp.record_result(
      p_test_no, p_assertion, false, 'operation unexpectedly succeeded'
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.record_result(
      p_test_no, p_assertion, true, format('[%s] %s', SQLSTATE, SQLERRM)
    );
  END;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_result(
  p_test_no integer,
  p_assertion text,
  p_condition boolean,
  p_detail text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_temp.record_result(
    p_test_no, p_assertion, COALESCE(p_condition, false), p_detail
  );
END;
$$;

DO $fixtures$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data
  ) VALUES
    ('10000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000000', 'authenticated',
     'authenticated', 'gate-student@example.invalid', '', now(), now(),
     '{"full_name":"Gate Student"}', '{}'),
    ('10000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000000', 'authenticated',
     'authenticated', 'gate-admin@example.invalid', '', now(), now(),
     '{"full_name":"Gate Admin"}', '{}'),
    ('10000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0000-000000000000', 'authenticated',
     'authenticated', 'gate-other@example.invalid', '', now(), now(),
     '{"full_name":"Gate Other"}', '{}'),
    ('10000000-0000-0000-0000-000000000004',
     '00000000-0000-0000-0000-000000000000', 'authenticated',
     'authenticated', 'gate-meta-admin@example.invalid', '', now(), now(),
     '{"full_name":"Metadata Admin","role":"admin"}', '{}'),
    ('10000000-0000-0000-0000-000000000005',
     '00000000-0000-0000-0000-000000000000', 'authenticated',
     'authenticated', 'gate-meta-rider@example.invalid', '', now(), now(),
     '{"full_name":"Metadata Rider","role":"rider"}', '{}');

  UPDATE public.user_profiles
  SET role = 'admin'::public.user_role
  WHERE id = '10000000-0000-0000-0000-000000000002';

  UPDATE public.wallets
  SET balance = CASE
    WHEN user_id = '10000000-0000-0000-0000-000000000001' THEN 100
    ELSE 50
  END
  WHERE user_id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003'
  );

  INSERT INTO public.transactions (
    id, user_id, wallet_id, transaction_type, amount, status, description
  )
  SELECT
    CASE WHEN w.user_id = '10000000-0000-0000-0000-000000000001'
      THEN '40000000-0000-0000-0000-000000000001'::uuid
      ELSE '40000000-0000-0000-0000-000000000002'::uuid END,
    w.user_id, w.id, 'credit', 1, 'pending', 'security gate fixture'
  FROM public.wallets AS w
  WHERE w.user_id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003'
  );

  INSERT INTO public.wallet_transactions (
    id, user_id, amount, type, description
  ) VALUES
    ('50000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0000-000000000001', 1, 'credit', 'gate own'),
    ('50000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000003', 1, 'credit', 'gate other');

  INSERT INTO public.restaurants (id, name, slug, is_available)
  VALUES (
    '20000000-0000-0000-0000-000000000001',
    'Security Gate Restaurant', 'security-gate-restaurant', true
  );
  INSERT INTO public.menu_items (
    id, restaurant_id, external_id, name, price, is_available
  ) VALUES (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'security-gate-item', 'Security Gate Item', 25, true
  );
END;
$fixtures$;

ALTER TABLE public.user_profiles
  ADD COLUMN security_test_verified boolean NOT NULL DEFAULT false;

SELECT pg_temp.assert_result(
  1, 'signup metadata requesting admin still creates student',
  (SELECT role = 'student' FROM public.user_profiles
   WHERE id = '10000000-0000-0000-0000-000000000004')
);
SELECT pg_temp.assert_result(
  2, 'signup metadata requesting rider still creates student',
  (SELECT role = 'student' FROM public.user_profiles
   WHERE id = '10000000-0000-0000-0000-000000000005')
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true
);

UPDATE public.user_profiles SET full_name = 'Allowed Name'
WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_result(
  3, 'student can update full_name',
  (SELECT full_name = 'Allowed Name' FROM public.user_profiles
   WHERE id = '10000000-0000-0000-0000-000000000001')
);
UPDATE public.user_profiles SET avatar_url = 'https://example.invalid/avatar'
WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_result(
  4, 'student can update avatar_url',
  (SELECT avatar_url = 'https://example.invalid/avatar' FROM public.user_profiles
   WHERE id = '10000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.expect_error(5, 'student cannot update role',
  $$UPDATE public.user_profiles SET role = 'admin'
    WHERE id = '10000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error(6, 'student cannot update verification fields',
  $$UPDATE public.user_profiles SET security_test_verified = true
    WHERE id = '10000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error(7, 'student cannot update email through profile table',
  $$UPDATE public.user_profiles SET email = 'forged@example.invalid'
    WHERE id = '10000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error(8, 'student cannot insert own profile',
  $$INSERT INTO public.user_profiles(id, email)
    VALUES ('10000000-0000-0000-0000-000000000001', 'duplicate@example.invalid')$$);
SELECT pg_temp.expect_error(9, 'student cannot insert another user profile',
  $$INSERT INTO public.user_profiles(id, email)
    VALUES (gen_random_uuid(), 'forged-other@example.invalid')$$);
SELECT pg_temp.expect_error(10, 'student cannot delete profile',
  $$DELETE FROM public.user_profiles
    WHERE id = '10000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.assert_result(
  11, 'student cannot read another user profile',
  (SELECT count(*) = 0 FROM public.user_profiles
   WHERE id = '10000000-0000-0000-0000-000000000003')
);

SELECT pg_temp.assert_result(
  12, 'student can read own wallet',
  (SELECT count(*) = 1 FROM public.wallets
   WHERE user_id = '10000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_result(
  13, 'student cannot read another user wallet',
  (SELECT count(*) = 0 FROM public.wallets
   WHERE user_id = '10000000-0000-0000-0000-000000000003')
);
SELECT pg_temp.expect_error(14, 'student cannot update wallet balance',
  $$UPDATE public.wallets SET balance = 999
    WHERE user_id = '10000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error(15, 'student cannot insert wallet',
  $$INSERT INTO public.wallets(user_id, balance)
    VALUES ('10000000-0000-0000-0000-000000000001', 999)$$);
SELECT pg_temp.expect_error(16, 'student cannot delete wallet',
  $$DELETE FROM public.wallets
    WHERE user_id = '10000000-0000-0000-0000-000000000001'$$);

SELECT pg_temp.assert_result(
  17, 'student can read own transactions',
  (SELECT count(*) = 1 FROM public.transactions
   WHERE id = '40000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_result(
  18, 'student cannot read another user transactions',
  (SELECT count(*) = 0 FROM public.transactions
   WHERE id = '40000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.expect_error(19, 'student cannot insert transactions',
  $$INSERT INTO public.transactions
      (user_id, wallet_id, transaction_type, amount, status)
    SELECT '10000000-0000-0000-0000-000000000001', id,
           'credit', 999, 'completed'
    FROM public.wallets
    WHERE user_id = '10000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error(20, 'student cannot update transactions',
  $$UPDATE public.transactions SET amount = 999
    WHERE id = '40000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error(21, 'student cannot delete transactions',
  $$DELETE FROM public.transactions
    WHERE id = '40000000-0000-0000-0000-000000000001'$$);

SELECT pg_temp.assert_result(
  22, 'student can read own wallet_transactions',
  (SELECT count(*) = 1 FROM public.wallet_transactions
   WHERE id = '50000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_result(
  23, 'student cannot read another user wallet_transactions',
  (SELECT count(*) = 0 FROM public.wallet_transactions
   WHERE id = '50000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.expect_error(24, 'student cannot insert wallet_transactions',
  $$INSERT INTO public.wallet_transactions(user_id, amount, type)
    VALUES ('10000000-0000-0000-0000-000000000001', 999, 'credit')$$);
SELECT pg_temp.expect_error(25, 'student cannot update wallet_transactions',
  $$UPDATE public.wallet_transactions SET amount = 999
    WHERE id = '50000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_error(26, 'student cannot delete wallet_transactions',
  $$DELETE FROM public.wallet_transactions
    WHERE id = '50000000-0000-0000-0000-000000000001'$$);

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.expect_error(
  27, 'unauthenticated caller cannot call get_user_role',
  $$SELECT public.get_user_role('10000000-0000-0000-0000-000000000001')$$
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true
);
SELECT pg_temp.assert_result(
  28, 'student can retrieve only their permitted role information',
  public.get_user_role('10000000-0000-0000-0000-000000000001') = 'student'
);
SELECT pg_temp.expect_error(
  29, 'student cannot retrieve another user role',
  $$SELECT public.get_user_role('10000000-0000-0000-0000-000000000003')$$
);
SELECT pg_temp.expect_error(
  30, 'student cannot call admin_assign_user_role successfully',
  $$SELECT public.admin_assign_user_role(
      '10000000-0000-0000-0000-000000000003', 'rider')$$
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true
);
SELECT public.admin_assign_user_role(
  '10000000-0000-0000-0000-000000000003', 'student'
);
SELECT pg_temp.assert_result(
  31, 'authenticated admin can assign student',
  public.get_user_role('10000000-0000-0000-0000-000000000003') = 'student'
);
SELECT public.admin_assign_user_role(
  '10000000-0000-0000-0000-000000000003', 'rider'
);
SELECT pg_temp.assert_result(
  32, 'authenticated admin can assign rider',
  public.get_user_role('10000000-0000-0000-0000-000000000003') = 'rider'
);
SELECT public.admin_assign_user_role(
  '10000000-0000-0000-0000-000000000003', 'admin'
);
SELECT pg_temp.assert_result(
  33, 'authenticated admin can intentionally assign admin',
  public.get_user_role('10000000-0000-0000-0000-000000000003') = 'admin'
);

RESET ROLE;
SELECT pg_temp.assert_result(
  34, 'protected trigger-only functions cannot be executed by clients',
  NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.create_wallet_for_user()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.create_wallet_for_user()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.update_wallet_balance()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.update_wallet_balance()', 'EXECUTE')
);

SET LOCAL ROLE service_role;
UPDATE public.wallets SET balance = balance + 1
WHERE user_id = '10000000-0000-0000-0000-000000000003';
RESET ROLE;
SELECT pg_temp.assert_result(
  35, 'service_role backend path remains functional',
  (SELECT balance = 51 FROM public.wallets
   WHERE user_id = '10000000-0000-0000-0000-000000000003')
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true
);
CREATE TEMP TABLE checkout_observation ON COMMIT DROP AS
SELECT public.create_order_atomic(
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'cod',
  '[{"id":"30000000-0000-0000-0000-000000000001","quantity":2}]',
  10, NULL, 'security-gate-success'
) AS result;

SELECT pg_temp.assert_result(
  36, 'legitimate create_order_atomic succeeds',
  (SELECT result ? 'order_id' FROM checkout_observation)
);
SELECT pg_temp.assert_result(
  37, 'correct wallet amount is deducted',
  (SELECT balance = 90 FROM public.wallets
   WHERE user_id = '10000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.assert_result(
  38, 'order is created exactly once',
  (SELECT count(*) = 1 FROM public.orders
   WHERE checkout_idempotency_key = 'security-gate-success')
);
SELECT pg_temp.assert_result(
  39, 'order items are created correctly',
  (SELECT count(*) = 1 AND sum(quantity) = 2 AND sum(total_price) = 50
   FROM public.order_items
   WHERE order_id = (
     SELECT id FROM public.orders
     WHERE checkout_idempotency_key = 'security-gate-success'
   ))
);
SELECT pg_temp.assert_result(
  40, 'wallet transaction is recorded correctly',
  (SELECT count(*) = 1 AND sum(amount) = -10
   FROM public.wallet_transactions
   WHERE reference_id = (
     SELECT id FROM public.orders
     WHERE checkout_idempotency_key = 'security-gate-success'
   ) AND type = 'order_payment')
);
SELECT pg_temp.assert_result(
  41, 'transaction and ledger entries are correct',
  (SELECT count(*) = 0 FROM public.transactions
   WHERE order_id = (
     SELECT id FROM public.orders
     WHERE checkout_idempotency_key = 'security-gate-success'
   ))
  AND (SELECT wallet_used = 10 AND final_amount = 40
       FROM public.orders
       WHERE checkout_idempotency_key = 'security-gate-success')
);

SELECT pg_temp.expect_error(
  42, 'insufficient wallet balance fails',
  $$SELECT public.create_order_atomic(
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'cod',
      '[{"id":"30000000-0000-0000-0000-000000000001","quantity":10}]',
      999, NULL, 'security-gate-insufficient')$$
);

DO $invalid_input$
DECLARE
  v_bad_restaurant_failed boolean := false;
  v_bad_product_failed boolean := false;
BEGIN
  BEGIN
    PERFORM public.create_order_atomic(
      '10000000-0000-0000-0000-000000000001',
      '29999999-0000-0000-0000-000000000099',
      'cod',
      '[{"id":"30000000-0000-0000-0000-000000000001","quantity":1}]',
      0, NULL, 'security-gate-bad-restaurant'
    );
  EXCEPTION WHEN OTHERS THEN
    v_bad_restaurant_failed := true;
  END;
  BEGIN
    PERFORM public.create_order_atomic(
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'cod',
      '[{"id":"39999999-0000-0000-0000-000000000099","quantity":1}]',
      0, NULL, 'security-gate-bad-product'
    );
  EXCEPTION WHEN OTHERS THEN
    v_bad_product_failed := true;
  END;
  PERFORM pg_temp.assert_result(
    43, 'invalid restaurant and product input fail',
    v_bad_restaurant_failed AND v_bad_product_failed
  );
END;
$invalid_input$;

SELECT pg_temp.assert_result(
  44, 'failed checkout creates no order',
  (SELECT count(*) = 0 FROM public.orders
   WHERE checkout_idempotency_key IN (
     'security-gate-insufficient', 'security-gate-bad-restaurant',
     'security-gate-bad-product'
   ))
);
SELECT pg_temp.assert_result(
  45, 'failed checkout creates no order items',
  NOT EXISTS (
    SELECT 1 FROM public.order_items AS oi
    JOIN public.orders AS o ON o.id = oi.order_id
    WHERE o.checkout_idempotency_key IN (
      'security-gate-insufficient', 'security-gate-bad-restaurant',
      'security-gate-bad-product'
    )
  )
);
SELECT pg_temp.assert_result(
  46, 'failed checkout creates no ledger rows',
  NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions AS wt
    JOIN public.orders AS o ON o.id = wt.reference_id
    WHERE o.checkout_idempotency_key IN (
      'security-gate-insufficient', 'security-gate-bad-restaurant',
      'security-gate-bad-product'
    )
  )
);
SELECT pg_temp.assert_result(
  47, 'failed checkout leaves wallet unchanged',
  (SELECT balance = 90 FROM public.wallets
   WHERE user_id = '10000000-0000-0000-0000-000000000001')
);

CREATE TEMP TABLE replay_observation ON COMMIT DROP AS
SELECT public.create_order_atomic(
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'cod',
  '[{"id":"30000000-0000-0000-0000-000000000001","quantity":2}]',
  10, NULL, 'security-gate-success'
) AS result;
CREATE TEMP TABLE second_checkout_observation ON COMMIT DROP AS
SELECT public.create_order_atomic(
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'cod',
  '[{"id":"30000000-0000-0000-0000-000000000001","quantity":1}]',
  5, NULL, 'security-gate-second-success'
) AS result;
SELECT pg_temp.assert_result(
  48, 'replay, idempotency, and repeated same-transaction calls match contract',
  (SELECT result->>'idempotent_replay' = 'true' FROM replay_observation)
  AND (SELECT result->>'idempotent_replay' = 'false'
       FROM second_checkout_observation)
  AND (SELECT count(*) = 1 FROM public.orders
       WHERE checkout_idempotency_key = 'security-gate-success')
  AND (SELECT count(*) = 1 FROM public.orders
       WHERE checkout_idempotency_key = 'security-gate-second-success')
  AND (SELECT balance = 85 FROM public.wallets
       WHERE user_id = '10000000-0000-0000-0000-000000000001')
  AND to_regclass('pg_temp.tmp_checkout_items') IS NULL
);

RESET ROLE;
SELECT pg_temp.assert_result(
  49, 'authenticated has SELECT on user_profiles',
  has_table_privilege('authenticated', 'public.user_profiles', 'SELECT')
);
SELECT pg_temp.assert_result(
  50, 'authenticated has UPDATE only on full_name and avatar_url',
  has_column_privilege('authenticated', 'public.user_profiles', 'full_name', 'UPDATE')
  AND has_column_privilege('authenticated', 'public.user_profiles', 'avatar_url', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.user_profiles', 'role', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.user_profiles', 'email', 'UPDATE')
  AND NOT has_column_privilege(
    'authenticated', 'public.user_profiles', 'security_test_verified', 'UPDATE'
  )
);
SELECT pg_temp.assert_result(
  51, 'authenticated lacks INSERT and DELETE on user_profiles',
  NOT has_table_privilege('authenticated', 'public.user_profiles', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.user_profiles', 'DELETE')
);
SELECT pg_temp.assert_result(
  52, 'authenticated has SELECT-only wallet and ledger access',
  has_table_privilege('authenticated', 'public.wallets', 'SELECT')
  AND has_table_privilege('authenticated', 'public.transactions', 'SELECT')
  AND has_table_privilege('authenticated', 'public.wallet_transactions', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.wallets', 'INSERT,UPDATE,DELETE')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'INSERT,UPDATE,DELETE')
  AND NOT has_table_privilege(
    'authenticated', 'public.wallet_transactions', 'INSERT,UPDATE,DELETE'
  )
);
SELECT pg_temp.assert_result(
  53, 'anon has no unintended protected data access',
  NOT has_table_privilege('anon', 'public.user_profiles', 'SELECT,INSERT,UPDATE,DELETE')
  AND NOT has_table_privilege('anon', 'public.wallets', 'SELECT,INSERT,UPDATE,DELETE')
  AND NOT has_table_privilege('anon', 'public.transactions', 'SELECT,INSERT,UPDATE,DELETE')
  AND NOT has_table_privilege(
    'anon', 'public.wallet_transactions', 'SELECT,INSERT,UPDATE,DELETE'
  )
);
SELECT pg_temp.assert_result(
  54, 'service_role retains required backend access',
  has_table_privilege('service_role', 'public.user_profiles', 'SELECT,INSERT,UPDATE,DELETE')
  AND has_table_privilege('service_role', 'public.wallets', 'SELECT,INSERT,UPDATE,DELETE')
  AND has_table_privilege('service_role', 'public.transactions', 'SELECT,INSERT,UPDATE,DELETE')
  AND has_table_privilege(
    'service_role', 'public.wallet_transactions', 'SELECT,INSERT,UPDATE,DELETE'
  )
);
SELECT pg_temp.assert_result(
  55, 'protected functions have fixed search_path',
  NOT EXISTS (
    SELECT 1
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_user_role', 'admin_assign_user_role', 'is_admin_user',
        'handle_new_user', 'create_wallet_for_user', 'update_wallet_balance',
        'create_order_atomic'
      )
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  )
);
SELECT pg_temp.assert_result(
  56, 'PUBLIC execute privileges are revoked where required',
  NOT EXISTS (
    SELECT 1
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(
      COALESCE(p.proacl, acldefault('f', p.proowner))
    ) AS privilege
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_user_role', 'admin_assign_user_role', 'is_admin_user',
        'handle_new_user', 'create_wallet_for_user', 'update_wallet_balance'
      )
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  )
);

DO $report$
DECLARE
  v_result record;
  v_failures text;
  v_passed integer;
  v_failed integer;
BEGIN
  FOR v_result IN
    SELECT * FROM security_gate_results ORDER BY test_no
  LOOP
    RAISE NOTICE '% | % | % | %',
      v_result.test_no,
      CASE WHEN v_result.passed THEN 'PASS' ELSE 'FAIL' END,
      v_result.assertion,
      COALESCE(v_result.detail, '');
  END LOOP;

  SELECT count(*) FILTER (WHERE passed), count(*) FILTER (WHERE NOT passed)
  INTO v_passed, v_failed
  FROM security_gate_results;
  RAISE NOTICE 'SECURITY GATE SUMMARY: % PASS, % FAIL, % TOTAL',
    v_passed, v_failed, v_passed + v_failed;

  IF (SELECT count(*) FROM security_gate_results) <> 56 THEN
    RAISE EXCEPTION 'security gate incomplete: expected 56 results, got %',
      (SELECT count(*) FROM security_gate_results);
  END IF;

  IF v_failed > 0 THEN
    SELECT string_agg(format('%s:%s', test_no, assertion), '; ' ORDER BY test_no)
    INTO v_failures
    FROM security_gate_results
    WHERE NOT passed;
    RAISE EXCEPTION 'security gate failed (% failures): %', v_failed, v_failures;
  END IF;
END;
$report$;

ROLLBACK;
