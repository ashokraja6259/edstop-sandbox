-- Forward-only correction for Production schema drift.
--
-- 20260308000107 used CREATE TABLE IF NOT EXISTS for public.order_items.
-- That creates the intended nine-column table on a fresh database, but it does
-- not add missing columns when an older eight-column table already exists.
--
-- item_id is a nullable TEXT snapshot identifier used by dark-store and
-- payment-created order items. Food items continue to use menu_item_id UUID.
-- The values are intentionally polymorphic, so item_id has no foreign key.
DO $migration$
DECLARE
  v_item_id_type TEXT;
  v_item_id_not_null BOOLEAN;
  v_item_id_default TEXT;
  v_item_id_constraint TEXT;
BEGIN
  IF to_regclass('public.order_items') IS NULL THEN
    RAISE EXCEPTION
      'public.order_items is missing; migration history is incomplete';
  END IF;

  SELECT
    pg_catalog.format_type(a.atttypid, a.atttypmod),
    a.attnotnull,
    pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)
  INTO
    v_item_id_type,
    v_item_id_not_null,
    v_item_id_default
  FROM pg_catalog.pg_attribute AS a
  LEFT JOIN pg_catalog.pg_attrdef AS ad
    ON ad.adrelid = a.attrelid
   AND ad.adnum = a.attnum
  WHERE a.attrelid = 'public.order_items'::regclass
    AND a.attname = 'item_id'
    AND NOT a.attisdropped;

  IF v_item_id_type IS NULL THEN
    ALTER TABLE public.order_items
      ADD COLUMN item_id TEXT;
  ELSIF v_item_id_type <> 'text'
     OR v_item_id_not_null
     OR v_item_id_default IS NOT NULL THEN
    RAISE EXCEPTION
      'public.order_items.item_id is incompatible: type=%, not_null=%, default=%',
      v_item_id_type,
      v_item_id_not_null,
      COALESCE(v_item_id_default, '<none>');
  END IF;

  SELECT c.conname
  INTO v_item_id_constraint
  FROM pg_catalog.pg_constraint AS c
  WHERE c.conrelid = 'public.order_items'::regclass
    AND (
      SELECT a.attnum = ANY(c.conkey)
      FROM pg_catalog.pg_attribute AS a
      WHERE a.attrelid = c.conrelid
        AND a.attname = 'item_id'
        AND NOT a.attisdropped
    )
  ORDER BY c.conname
  LIMIT 1;

  IF v_item_id_constraint IS NOT NULL THEN
    RAISE EXCEPTION
      'public.order_items.item_id has unexpected constraint %',
      v_item_id_constraint;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'item_id'
      AND data_type = 'text'
      AND is_nullable = 'YES'
      AND column_default IS NULL
  ) THEN
    RAISE EXCEPTION
      'public.order_items.item_id postcondition failed';
  END IF;
END;
$migration$;

COMMENT ON COLUMN public.order_items.item_id IS
  'Nullable polymorphic snapshot identifier for non-food order items; food items use menu_item_id.';
