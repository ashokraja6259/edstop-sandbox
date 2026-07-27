BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.expect_insufficient_privilege(
  p_label text,
  p_sql text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION '%: unexpectedly succeeded', p_label;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: %', p_label;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(
  p_label text,
  p_condition boolean
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT COALESCE(p_condition, false) THEN
    RAISE EXCEPTION '%: assertion failed', p_label;
  END IF;
  RAISE NOTICE 'PASS: %', p_label;
END;
$$;

DO $fixtures$
DECLARE
  v_student uuid := '10000000-0000-0000-0000-000000000001';
  v_admin uuid := '10000000-0000-0000-0000-000000000002';
  v_signup uuid := '10000000-0000-0000-0000-000000000003';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data
  ) VALUES
    (v_student, '00000000-0000-0000-0000-000000000000', 'authenticated',
     'authenticated', 'security-student@example.invalid', '', now(), now(),
     '{"full_name":"Security Student"}', '{}'),
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated',
     'authenticated', 'security-admin@example.invalid', '', now(), now(),
     '{"full_name":"Security Admin"}', '{}');

  UPDATE public.user_profiles SET role = 'admin' WHERE id = v_admin;
  UPDATE public.wallets SET balance = 100 WHERE user_id = v_student;

  -- This is the privileged signup metadata attempt. The auth trigger must ignore it.
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data
  ) VALUES (
    v_signup, '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'security-signup@example.invalid', '', now(), now(),
    '{"full_name":"Metadata Attacker","role":"admin"}', '{}'
  );
END;
$fixtures$;

SELECT pg_temp.assert_true(
  'privileged signup metadata is ignored',
  (SELECT role = 'student' FROM public.user_profiles
   WHERE id = '10000000-0000-0000-0000-000000000003')
);

-- Add a representative future verification field inside this rolled-back test.
-- Since UPDATE was granted only by column, it must remain non-writable.
ALTER TABLE public.user_profiles
  ADD COLUMN security_test_verified boolean NOT NULL DEFAULT false;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';

SELECT pg_temp.expect_insufficient_privilege(
  'student self-promotion attempt',
  $$UPDATE public.user_profiles SET role = 'admin'
    WHERE id = '10000000-0000-0000-0000-000000000001'$$
);

UPDATE public.user_profiles
SET full_name = 'Allowed profile edit'
WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true(
  'student full_name update',
  (SELECT full_name = 'Allowed profile edit' FROM public.user_profiles
   WHERE id = '10000000-0000-0000-0000-000000000001')
);

SELECT pg_temp.expect_insufficient_privilege(
  'student verification-field update',
  $$UPDATE public.user_profiles SET security_test_verified = true
    WHERE id = '10000000-0000-0000-0000-000000000001'$$
);

SELECT pg_temp.expect_insufficient_privilege(
  'student profile insert',
  $$INSERT INTO public.user_profiles (id, email, role)
    VALUES (gen_random_uuid(), 'forged@example.invalid', 'student')$$
);

SELECT pg_temp.expect_insufficient_privilege(
  'student profile delete',
  $$DELETE FROM public.user_profiles
    WHERE id = '10000000-0000-0000-0000-000000000001'$$
);

SELECT pg_temp.expect_insufficient_privilege(
  'student wallet update',
  $$UPDATE public.wallets SET balance = 999999
    WHERE user_id = '10000000-0000-0000-0000-000000000001'$$
);

SELECT pg_temp.expect_insufficient_privilege(
  'student fake-credit insert',
  $$INSERT INTO public.transactions
      (user_id, wallet_id, transaction_type, amount, status)
    SELECT '10000000-0000-0000-0000-000000000001', id,
           'credit', 999999, 'completed'
    FROM public.wallets
    WHERE user_id = '10000000-0000-0000-0000-000000000001'$$
);

SELECT pg_temp.expect_insufficient_privilege(
  'student wallet_transactions insert',
  $$INSERT INTO public.wallet_transactions (user_id, amount, type)
    VALUES ('10000000-0000-0000-0000-000000000001', 999999, 'credit')$$
);

SELECT pg_temp.expect_insufficient_privilege(
  'student calling admin role RPC',
  $$SELECT public.admin_assign_user_role(
      '10000000-0000-0000-0000-000000000003', 'rider')$$
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';
SELECT public.admin_assign_user_role(
  '10000000-0000-0000-0000-000000000003',
  'rider'
);
SELECT pg_temp.assert_true(
  'real admin calling role RPC',
  public.get_user_role('10000000-0000-0000-0000-000000000003') = 'rider'
);

RESET ROLE;
DO $checkout_fixture$
DECLARE
  v_restaurant uuid := '20000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.restaurants (id, name, slug, is_available)
  VALUES (v_restaurant, 'Security Test Restaurant', 'security-test-restaurant', true);
  INSERT INTO public.menu_items (
    id, restaurant_id, external_id, name, price, is_available
  ) VALUES (
    '30000000-0000-0000-0000-000000000001',
    v_restaurant, 'security-item', 'Security Test Item', 25, true
  );
END;
$checkout_fixture$;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
SELECT public.create_order_atomic(
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'cod',
  '[{"id":"30000000-0000-0000-0000-000000000001","quantity":1}]',
  10,
  NULL,
  'security-gate-checkout'
);
SELECT pg_temp.assert_true(
  'legitimate wallet checkout deduction',
  (SELECT balance = 90 FROM public.wallets
   WHERE user_id = '10000000-0000-0000-0000-000000000001')
);

RESET ROLE;

SELECT pg_temp.assert_true(
  'authenticated has no table-level profile UPDATE',
  NOT has_table_privilege('authenticated', 'public.user_profiles', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.user_profiles', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.user_profiles', 'DELETE')
);
SELECT pg_temp.assert_true(
  'authenticated may update only approved profile columns',
  has_column_privilege('authenticated', 'public.user_profiles', 'full_name', 'UPDATE')
  AND has_column_privilege('authenticated', 'public.user_profiles', 'avatar_url', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.user_profiles', 'role', 'UPDATE')
  AND NOT has_column_privilege(
    'authenticated', 'public.user_profiles', 'security_test_verified', 'UPDATE'
  )
);
SELECT pg_temp.assert_true(
  'authenticated cannot mutate wallets or ledgers',
  NOT has_table_privilege('authenticated', 'public.wallets', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.wallets', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.wallets', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.wallet_transactions', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.wallet_transactions', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.wallet_transactions', 'DELETE')
);

ROLLBACK;
