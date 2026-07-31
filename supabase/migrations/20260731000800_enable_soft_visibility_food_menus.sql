-- Make the four reviewed food outlets browsable by authenticated students while
-- keeping every ordering path closed. The application treats is_active as
-- catalog visibility and requires is_available + is_open before enabling cart
-- or checkout. This migration intentionally does not touch owners, orders,
-- wallets, payments, RLS policies, RPCs, or legacy restaurants.

DO $$
DECLARE
  v_restaurant_count INTEGER;
  v_menu_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_restaurant_count
  FROM public.restaurants
  WHERE slug IN (
    'amigos-grill-cafe',
    'spicy-darbar',
    'amigos-andhra-bhawan',
    'red-panda'
  );

  IF v_restaurant_count <> 4 THEN
    RAISE EXCEPTION
      'soft visibility requires exactly four reviewed restaurants; found %',
      v_restaurant_count;
  END IF;

  SELECT COUNT(*)
  INTO v_menu_count
  FROM public.menu_items AS item
  JOIN public.restaurants AS restaurant
    ON restaurant.id = item.restaurant_id
  WHERE restaurant.slug IN (
    'amigos-grill-cafe',
    'spicy-darbar',
    'amigos-andhra-bhawan',
    'red-panda'
  );

  IF v_menu_count <> 884 THEN
    RAISE EXCEPTION
      'soft visibility requires exactly 884 reviewed menu rows; found %',
      v_menu_count;
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
      AND NULLIF(BTRIM(item.category), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'soft visibility blocked: reviewed menu contains an empty category';
  END IF;

  UPDATE public.restaurants
  SET is_active = true,
      is_available = false,
      is_open = false
  WHERE slug IN (
    'amigos-grill-cafe',
    'spicy-darbar',
    'amigos-andhra-bhawan',
    'red-panda'
  );

  UPDATE public.menu_items AS item
  SET is_available = false
  FROM public.restaurants AS restaurant
  WHERE restaurant.id = item.restaurant_id
    AND restaurant.slug IN (
      'amigos-grill-cafe',
      'spicy-darbar',
      'amigos-andhra-bhawan',
      'red-panda'
    );

  IF (
    SELECT COUNT(*)
    FROM public.restaurants
    WHERE slug IN (
      'amigos-grill-cafe',
      'spicy-darbar',
      'amigos-andhra-bhawan',
      'red-panda'
    )
      AND is_active IS TRUE
      AND is_available IS FALSE
      AND is_open IS FALSE
  ) <> 4 THEN
    RAISE EXCEPTION 'soft visibility postcondition failed for reviewed restaurants';
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
      AND item.is_available IS TRUE
  ) THEN
    RAISE EXCEPTION 'soft visibility postcondition failed: ordering remains enabled';
  END IF;
END;
$$;
