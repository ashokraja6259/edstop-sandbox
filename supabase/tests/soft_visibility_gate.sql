-- Run after the complete migration chain. This suite is read-only and verifies
-- that the reviewed outlets are browsable but remain impossible to order from.

DO $$
DECLARE
  v_restaurants INTEGER;
  v_items INTEGER;
  v_categories INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_restaurants
  FROM public.restaurants
  WHERE slug IN (
    'amigos-grill-cafe',
    'spicy-darbar',
    'amigos-andhra-bhawan',
    'red-panda'
  )
    AND is_active IS TRUE
    AND is_available IS FALSE
    AND is_open IS FALSE;

  IF v_restaurants <> 4 THEN
    RAISE EXCEPTION 'soft visibility gate: expected four active, closed outlets; found %', v_restaurants;
  END IF;

  SELECT COUNT(*), COUNT(DISTINCT (restaurant.slug, item.category))
  INTO v_items, v_categories
  FROM public.menu_items AS item
  JOIN public.restaurants AS restaurant
    ON restaurant.id = item.restaurant_id
  WHERE restaurant.slug IN (
    'amigos-grill-cafe',
    'spicy-darbar',
    'amigos-andhra-bhawan',
    'red-panda'
  );

  IF v_items <> 884 OR v_categories <> 61 THEN
    RAISE EXCEPTION
      'soft visibility gate: expected 884 items / 61 categories; found % / %',
      v_items,
      v_categories;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menu_items AS item
    JOIN public.restaurants AS restaurant
      ON restaurant.id = item.restaurant_id
    WHERE restaurant.slug IN (
      'amigos-grill-cafe',
      'spicy-darbar',
      'amigos-andhra-bhawan',
      'red-panda'
    )
      AND (
        item.is_available IS TRUE
        OR NULLIF(BTRIM(item.category), '') IS NULL
        OR item.category_sort_order IS NULL
        OR item.item_sort_order IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'soft visibility gate: orderability or category metadata is invalid';
  END IF;

  IF EXISTS (
    SELECT item.restaurant_id, item.external_id
    FROM public.menu_items AS item
    JOIN public.restaurants AS restaurant
      ON restaurant.id = item.restaurant_id
    WHERE restaurant.slug IN (
      'amigos-grill-cafe',
      'spicy-darbar',
      'amigos-andhra-bhawan',
      'red-panda'
    )
    GROUP BY item.restaurant_id, item.external_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'soft visibility gate: duplicate reviewed menu rows found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_index AS index_row
    JOIN pg_class AS table_row ON table_row.oid = index_row.indrelid
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = table_row.oid
      AND attribute_row.attnum = ANY(index_row.indkey)
    WHERE table_row.oid = 'public.restaurants'::regclass
      AND attribute_row.attname = 'owner_id'
      AND index_row.indisunique
  ) THEN
    RAISE EXCEPTION 'soft visibility gate: owner_id is unexpectedly unique';
  END IF;
END;
$$;
