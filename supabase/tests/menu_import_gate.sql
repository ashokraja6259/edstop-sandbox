BEGIN;

DO $initial_staging_gate$
DECLARE
  v_restaurant_count INTEGER;
  v_item_count INTEGER;
BEGIN
  SELECT count(*) INTO v_restaurant_count
  FROM public.restaurants
  WHERE slug IN (
    'amigos-grill-cafe', 'spicy-darbar',
    'amigos-andhra-bhawan', 'red-panda'
  )
    AND is_active IS FALSE
    AND is_available IS FALSE
    AND is_open IS FALSE;

  SELECT count(*) INTO v_item_count
  FROM public.menu_items AS item
  JOIN public.restaurants AS restaurant ON restaurant.id = item.restaurant_id
  WHERE restaurant.slug IN (
    'amigos-grill-cafe', 'spicy-darbar',
    'amigos-andhra-bhawan', 'red-panda'
  )
    AND item.is_available IS FALSE;

  IF v_restaurant_count <> 4 OR v_item_count <> 884 THEN
    RAISE EXCEPTION
      'staged menu mismatch: % restaurants, % items',
      v_restaurant_count, v_item_count;
  END IF;

  IF (SELECT count(*)
      FROM public.menu_items
      WHERE source_pdf = 'AMIGOS 1.pdf'
        AND logical_item_name = 'Veg Arabian Mandi') <> 3
     OR EXISTS (
       (SELECT portion_name, price
        FROM public.menu_items
        WHERE source_pdf = 'AMIGOS 1.pdf'
          AND logical_item_name = 'Veg Arabian Mandi'
        EXCEPT VALUES
          ('Single Serving'::TEXT, 249::NUMERIC),
          ('Half Platter'::TEXT, 499::NUMERIC),
          ('Full Platter'::TEXT, 799::NUMERIC))
       UNION ALL
       (VALUES
          ('Single Serving'::TEXT, 249::NUMERIC),
          ('Half Platter'::TEXT, 499::NUMERIC),
          ('Full Platter'::TEXT, 799::NUMERIC)
        EXCEPT SELECT portion_name, price
        FROM public.menu_items
        WHERE source_pdf = 'AMIGOS 1.pdf'
          AND logical_item_name = 'Veg Arabian Mandi')
     ) THEN
    RAISE EXCEPTION 'approved Veg Arabian Mandi variants do not match';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.menu_items
    WHERE source_pdf = 'AMIGOS 1.pdf'
      AND source_page = 36
      AND logical_item_name = 'Peri-Peri Chicken Mac & Cheese'
      AND price = 229
  ) THEN
    RAISE EXCEPTION 'reviewed Mac & Cheese price is missing';
  END IF;
END;
$initial_staging_gate$;

CREATE TEMP TABLE menu_gate_orders_before AS
SELECT to_jsonb(row_data) AS row_data FROM public.orders AS row_data;
CREATE TEMP TABLE menu_gate_order_items_before AS
SELECT to_jsonb(row_data) AS row_data FROM public.order_items AS row_data;
CREATE TEMP TABLE menu_gate_wallets_before AS
SELECT to_jsonb(row_data) AS row_data FROM public.wallets AS row_data;

-- Simulate the separately approved activation operation. The transaction is
-- rolled back so this gate never leaves any environment activated.
UPDATE public.restaurants
SET is_available = false,
    is_open = false
WHERE slug NOT IN (
  'amigos-grill-cafe', 'spicy-darbar',
  'amigos-andhra-bhawan', 'red-panda'
);

UPDATE public.restaurants
SET is_available = true,
    is_open = true,
    is_active = true
WHERE slug IN (
  'amigos-grill-cafe', 'spicy-darbar',
  'amigos-andhra-bhawan', 'red-panda'
);

UPDATE public.menu_items AS item
SET is_available = true
FROM public.restaurants AS restaurant
WHERE restaurant.id = item.restaurant_id
  AND restaurant.slug IN (
    'amigos-grill-cafe', 'spicy-darbar',
    'amigos-andhra-bhawan', 'red-panda'
  );

SET LOCAL ROLE anon;

DO $anonymous_visibility_gate$
BEGIN
  IF (SELECT count(*) FROM public.restaurants) <> 4 THEN
    RAISE EXCEPTION 'anonymous activation preview does not expose exactly four outlets';
  END IF;

  IF (SELECT count(*) FROM public.menu_items) <> 884 THEN
    RAISE EXCEPTION 'anonymous activation preview does not expose exactly 884 items';
  END IF;
END;
$anonymous_visibility_gate$;

RESET ROLE;

DO $unrelated_data_gate$
BEGIN
  IF EXISTS (
    (SELECT row_data FROM menu_gate_orders_before
     EXCEPT SELECT to_jsonb(row_data) FROM public.orders AS row_data)
    UNION ALL
    (SELECT to_jsonb(row_data) FROM public.orders AS row_data
     EXCEPT SELECT row_data FROM menu_gate_orders_before)
  ) THEN
    RAISE EXCEPTION 'historical orders changed during activation preview';
  END IF;

  IF EXISTS (
    (SELECT row_data FROM menu_gate_order_items_before
     EXCEPT SELECT to_jsonb(row_data) FROM public.order_items AS row_data)
    UNION ALL
    (SELECT to_jsonb(row_data) FROM public.order_items AS row_data
     EXCEPT SELECT row_data FROM menu_gate_order_items_before)
  ) THEN
    RAISE EXCEPTION 'historical order items changed during activation preview';
  END IF;

  IF EXISTS (
    (SELECT row_data FROM menu_gate_wallets_before
     EXCEPT SELECT to_jsonb(row_data) FROM public.wallets AS row_data)
    UNION ALL
    (SELECT to_jsonb(row_data) FROM public.wallets AS row_data
     EXCEPT SELECT row_data FROM menu_gate_wallets_before)
  ) THEN
    RAISE EXCEPTION 'wallet data changed during activation preview';
  END IF;
END;
$unrelated_data_gate$;

ROLLBACK;
