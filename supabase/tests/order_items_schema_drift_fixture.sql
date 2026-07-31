\set ON_ERROR_STOP on

BEGIN;

-- Reproduce the eight-column Production table shape without customer data.
DROP TABLE public.order_items;

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  item_name TEXT,
  total_price NUMERIC
);

CREATE INDEX idx_order_items_order
ON public.order_items(order_id);

CREATE INDEX idx_order_items_order_id
ON public.order_items(order_id);

CREATE INDEX idx_order_items_menu_item_id
ON public.order_items(menu_item_id);

INSERT INTO public.order_items (
  id,
  quantity,
  price,
  item_name,
  total_price
)
VALUES
  ('91000000-0000-0000-0000-000000000001', 2, 20, 'Historical food snapshot', 40),
  ('91000000-0000-0000-0000-000000000002', 1, 125, 'Historical store snapshot', 125);

CREATE TEMP TABLE order_items_before AS
SELECT * FROM public.order_items ORDER BY id;

\ir ../migrations/20260731000500_reconcile_order_items_item_id.sql

DO $test$
DECLARE
  v_rows_before BIGINT;
  v_rows_after BIGINT;
  v_item_id_constraints BIGINT;
BEGIN
  SELECT count(*) INTO v_rows_before FROM order_items_before;
  SELECT count(*) INTO v_rows_after FROM public.order_items;

  IF v_rows_before <> 2 OR v_rows_after <> v_rows_before THEN
    RAISE EXCEPTION
      'order_items rows were not preserved: before=%, after=%',
      v_rows_before,
      v_rows_after;
  END IF;

  IF EXISTS (
    (SELECT id, order_id, menu_item_id, quantity, price, created_at, item_name, total_price
     FROM order_items_before)
    EXCEPT
    (SELECT id, order_id, menu_item_id, quantity, price, created_at, item_name, total_price
     FROM public.order_items)
  ) THEN
    RAISE EXCEPTION 'existing order_items values changed';
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
    RAISE EXCEPTION 'item_id was not reconciled as nullable text';
  END IF;

  SELECT count(*)
  INTO v_item_id_constraints
  FROM pg_catalog.pg_constraint AS c
  JOIN pg_catalog.pg_attribute AS a
    ON a.attrelid = c.conrelid
   AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.order_items'::regclass
    AND a.attname = 'item_id';

  IF v_item_id_constraints <> 0 THEN
    RAISE EXCEPTION
      'item_id received an unexpected constraint';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.order_items
    WHERE id IN (
      '91000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000002'
    )
      AND item_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'historical rows were unexpectedly backfilled';
  END IF;
END;
$test$;

-- New polymorphic store identifiers are accepted without a false foreign key.
INSERT INTO public.order_items (
  quantity,
  price,
  item_name,
  total_price,
  item_id
)
VALUES (1, 20, 'New store snapshot', 20, 'p1');

ROLLBACK;
