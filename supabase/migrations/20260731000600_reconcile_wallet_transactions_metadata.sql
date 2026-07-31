-- Forward-only correction for Production schema drift.
--
-- 20260308000107 used CREATE TABLE IF NOT EXISTS for
-- public.wallet_transactions. That creates metadata on a fresh database, but
-- it does not add the column when an older wallet_transactions table already
-- exists. Payment finalization writes audit context to this column.
--
-- Existing ledger rows do not require synthesized audit data. The correction
-- therefore adds a nullable JSONB column without a default, index, constraint,
-- or backfill. Fresh databases retain the original nullable '{}'::JSONB
-- default because the column already exists there.
DO $migration$
DECLARE
  v_metadata_type TEXT;
  v_metadata_not_null BOOLEAN;
  v_metadata_default TEXT;
  v_metadata_generated "char";
  v_metadata_attnum SMALLINT;
  v_metadata_constraint TEXT;
  v_metadata_index TEXT;
  v_column_added BOOLEAN := FALSE;
BEGIN
  IF to_regclass('public.wallet_transactions') IS NULL THEN
    RAISE EXCEPTION
      'public.wallet_transactions is missing; migration history is incomplete';
  END IF;

  SELECT
    pg_catalog.format_type(a.atttypid, a.atttypmod),
    a.attnotnull,
    pg_catalog.pg_get_expr(ad.adbin, ad.adrelid),
    a.attgenerated,
    a.attnum
  INTO
    v_metadata_type,
    v_metadata_not_null,
    v_metadata_default,
    v_metadata_generated,
    v_metadata_attnum
  FROM pg_catalog.pg_attribute AS a
  LEFT JOIN pg_catalog.pg_attrdef AS ad
    ON ad.adrelid = a.attrelid
   AND ad.adnum = a.attnum
  WHERE a.attrelid = 'public.wallet_transactions'::regclass
    AND a.attname = 'metadata'
    AND NOT a.attisdropped;

  IF v_metadata_type IS NULL THEN
    ALTER TABLE public.wallet_transactions
      ADD COLUMN metadata JSONB;
    v_column_added := TRUE;
  ELSIF v_metadata_type <> 'jsonb'
     OR v_metadata_not_null
     OR v_metadata_generated <> ''::"char"
     OR (
       v_metadata_default IS NOT NULL
       AND v_metadata_default <> '''{}''::jsonb'
     ) THEN
    RAISE EXCEPTION
      'public.wallet_transactions.metadata is incompatible: type=%, not_null=%, generated=%, default=%',
      v_metadata_type,
      v_metadata_not_null,
      v_metadata_generated,
      COALESCE(v_metadata_default, '<none>');
  END IF;

  IF v_metadata_attnum IS NOT NULL THEN
    SELECT c.conname
    INTO v_metadata_constraint
    FROM pg_catalog.pg_constraint AS c
    WHERE c.conrelid = 'public.wallet_transactions'::regclass
      AND v_metadata_attnum = ANY(c.conkey)
    ORDER BY c.conname
    LIMIT 1;

    SELECT i.relname
    INTO v_metadata_index
    FROM pg_catalog.pg_index AS x
    JOIN pg_catalog.pg_class AS i
      ON i.oid = x.indexrelid
    WHERE x.indrelid = 'public.wallet_transactions'::regclass
      AND v_metadata_attnum = ANY(x.indkey)
    ORDER BY i.relname
    LIMIT 1;
  END IF;

  IF v_metadata_constraint IS NOT NULL THEN
    RAISE EXCEPTION
      'public.wallet_transactions.metadata has unexpected constraint %',
      v_metadata_constraint;
  END IF;

  IF v_metadata_index IS NOT NULL THEN
    RAISE EXCEPTION
      'public.wallet_transactions.metadata has unexpected index %',
      v_metadata_index;
  END IF;

  SELECT
    pg_catalog.format_type(a.atttypid, a.atttypmod),
    a.attnotnull,
    pg_catalog.pg_get_expr(ad.adbin, ad.adrelid),
    a.attgenerated
  INTO
    v_metadata_type,
    v_metadata_not_null,
    v_metadata_default,
    v_metadata_generated
  FROM pg_catalog.pg_attribute AS a
  LEFT JOIN pg_catalog.pg_attrdef AS ad
    ON ad.adrelid = a.attrelid
   AND ad.adnum = a.attnum
  WHERE a.attrelid = 'public.wallet_transactions'::regclass
    AND a.attname = 'metadata'
    AND NOT a.attisdropped;

  IF v_metadata_type <> 'jsonb'
     OR v_metadata_not_null
     OR v_metadata_generated <> ''::"char"
     OR (v_column_added AND v_metadata_default IS NOT NULL) THEN
    RAISE EXCEPTION
      'public.wallet_transactions.metadata postcondition failed';
  END IF;
END;
$migration$;

COMMENT ON COLUMN public.wallet_transactions.metadata IS
  'Optional immutable audit context supplied by trusted wallet and payment workflows.';
