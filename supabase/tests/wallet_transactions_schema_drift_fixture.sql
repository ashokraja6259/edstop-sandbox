\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE public.wallet_transactions
  DROP COLUMN metadata;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  'b1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'wallet-schema-gate@example.invalid',
  NULL,
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb
);

INSERT INTO public.wallet_transactions (
  id, user_id, amount, type, description
)
VALUES (
  'b2000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  1,
  'fixture',
  'pre-correction row'
);

\ir ../migrations/20260731000600_reconcile_wallet_transactions_metadata.sql

DO $verification$
DECLARE
  v_row_count BIGINT;
  v_metadata_type TEXT;
  v_metadata_nullable TEXT;
  v_metadata_default TEXT;
  v_metadata_value JSONB;
  v_constraint_count BIGINT;
  v_index_count BIGINT;
BEGIN
  SELECT count(*)
  INTO v_row_count
  FROM public.wallet_transactions
  WHERE id = 'b2000000-0000-0000-0000-000000000001';

  SELECT metadata
  INTO v_metadata_value
  FROM public.wallet_transactions
  WHERE id = 'b2000000-0000-0000-0000-000000000001';

  IF v_row_count <> 1 OR v_metadata_value IS NOT NULL THEN
    RAISE EXCEPTION
      'wallet transaction row preservation failed';
  END IF;

  SELECT data_type, is_nullable, column_default
  INTO v_metadata_type, v_metadata_nullable, v_metadata_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'wallet_transactions'
    AND column_name = 'metadata';

  IF v_metadata_type <> 'jsonb'
     OR v_metadata_nullable <> 'YES'
     OR v_metadata_default IS NOT NULL THEN
    RAISE EXCEPTION
      'wallet_transactions.metadata contract is incorrect';
  END IF;

  SELECT count(*)
  INTO v_constraint_count
  FROM pg_catalog.pg_constraint AS c
  JOIN pg_catalog.pg_attribute AS a
    ON a.attrelid = c.conrelid
   AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.wallet_transactions'::regclass
    AND a.attname = 'metadata';

  SELECT count(DISTINCT i.indexrelid)
  INTO v_index_count
  FROM pg_catalog.pg_index AS i
  JOIN LATERAL unnest(i.indkey) AS key(attnum)
    ON TRUE
  JOIN pg_catalog.pg_attribute AS a
    ON a.attrelid = i.indrelid
   AND a.attnum = key.attnum
  WHERE i.indrelid = 'public.wallet_transactions'::regclass
    AND a.attname = 'metadata';

  IF v_constraint_count <> 0 OR v_index_count <> 0 THEN
    RAISE EXCEPTION
      'wallet_transactions.metadata gained an unexpected constraint or index';
  END IF;

  IF to_regprocedure(
    'public.finalize_razorpay_payment(uuid,text,bigint,text,jsonb)'
  ) IS NULL OR to_regprocedure(
    'public.reserve_razorpay_refund(uuid,uuid,text,bigint)'
  ) IS NULL THEN
    RAISE EXCEPTION
      'payment function resolution failed';
  END IF;
END;
$verification$;

ROLLBACK;
