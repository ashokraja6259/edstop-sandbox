-- Migration: Food Ordering Realtime Tables
-- Adds restaurants, menu_items tables for live price/availability/stock tracking

-- 1. Create restaurants table
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  cuisines TEXT[] DEFAULT ARRAY[]::TEXT[],
  rating NUMERIC(3,1) DEFAULT 4.0,
  delivery_time TEXT DEFAULT '25-35 min',
  minimum_order NUMERIC(10,2) DEFAULT 149.00,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_available ON public.restaurants(is_available);

-- 2. Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  category TEXT DEFAULT 'Main Course',
  is_veg BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  stock_level INTEGER DEFAULT 100,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON public.menu_items(is_available);
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_restaurant_external ON public.menu_items(restaurant_id, external_id);

-- 3. Updated_at trigger function (reuse pattern)
CREATE OR REPLACE FUNCTION public.update_food_ordering_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restaurants_updated_at ON public.restaurants;
CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_food_ordering_updated_at();

DROP TRIGGER IF EXISTS menu_items_updated_at ON public.menu_items;
CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_food_ordering_updated_at();

-- 4. Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: public read, admin write
DROP POLICY IF EXISTS "public_read_restaurants" ON public.restaurants;
CREATE POLICY "public_read_restaurants"
  ON public.restaurants
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "authenticated_read_restaurants" ON public.restaurants;
CREATE POLICY "authenticated_read_restaurants"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "public_read_menu_items" ON public.menu_items;
CREATE POLICY "public_read_menu_items"
  ON public.menu_items
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "authenticated_read_menu_items" ON public.menu_items;
CREATE POLICY "authenticated_read_menu_items"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. Seed mock data for restaurants and menu items
DO $$
DECLARE
  r1_id UUID := gen_random_uuid();
  r2_id UUID := gen_random_uuid();
  r3_id UUID := gen_random_uuid();
  r4_id UUID := gen_random_uuid();
BEGIN
  -- Insert restaurants
  INSERT INTO public.restaurants (id, name, slug, cuisines, rating, delivery_time, minimum_order, is_available)
  VALUES
    (r1_id, 'Spice Garden', 'spice-garden', ARRAY['North Indian','Chinese','Tandoor'], 4.5, '25-30 min', 149.00, true),
    (r2_id, 'Pizza Paradise', 'pizza-paradise', ARRAY['Italian','Pizza','Pasta'], 4.3, '30-35 min', 149.00, true),
    (r3_id, 'Burger Hub', 'burger-hub', ARRAY['American','Burgers','Fast Food'], 4.2, '20-25 min', 149.00, true),
    (r4_id, 'South Spice', 'south-spice', ARRAY['South Indian','Dosa','Idli'], 4.6, '25-30 min', 149.00, true)
  ON CONFLICT (slug) DO NOTHING;

  -- Fetch actual IDs in case of conflict
  SELECT id INTO r1_id FROM public.restaurants WHERE slug = 'spice-garden' LIMIT 1;
  SELECT id INTO r2_id FROM public.restaurants WHERE slug = 'pizza-paradise' LIMIT 1;
  SELECT id INTO r3_id FROM public.restaurants WHERE slug = 'burger-hub' LIMIT 1;
  SELECT id INTO r4_id FROM public.restaurants WHERE slug = 'south-spice' LIMIT 1;

  -- Insert menu items for Spice Garden
  INSERT INTO public.menu_items (restaurant_id, external_id, name, description, price, original_price, category, is_veg, is_available, stock_level)
  VALUES
    (r1_id, 'm1', 'Paneer Butter Masala', 'Cottage cheese cubes in rich tomato-based gravy', 180.00, 180.00, 'Main Course', true, true, 50),
    (r1_id, 'm2', 'Chicken Biryani', 'Aromatic basmati rice with tender chicken', 220.00, 220.00, 'Main Course', false, true, 30),
    (r1_id, 'm3', 'Veg Manchurian', 'Deep-fried vegetable balls in spicy sauce', 150.00, 150.00, 'Starters', true, true, 40),
    (r1_id, 'm4', 'Garlic Naan', 'Soft leavened bread with garlic and butter', 40.00, 40.00, 'Breads', true, true, 100)
  ON CONFLICT (restaurant_id, external_id) DO NOTHING;

  -- Insert menu items for Pizza Paradise
  INSERT INTO public.menu_items (restaurant_id, external_id, name, description, price, original_price, category, is_veg, is_available, stock_level)
  VALUES
    (r2_id, 'm5', 'Margherita Pizza', 'Classic pizza with tomato sauce and mozzarella', 280.00, 280.00, 'Pizza', true, true, 20),
    (r2_id, 'm6', 'Chicken Pepperoni', 'Loaded with chicken pepperoni and extra cheese', 350.00, 350.00, 'Pizza', false, true, 15),
    (r2_id, 'm7', 'Pasta Alfredo', 'Creamy white sauce pasta with herbs', 200.00, 200.00, 'Pasta', true, true, 25)
  ON CONFLICT (restaurant_id, external_id) DO NOTHING;

  -- Insert menu items for Burger Hub
  INSERT INTO public.menu_items (restaurant_id, external_id, name, description, price, original_price, category, is_veg, is_available, stock_level)
  VALUES
    (r3_id, 'm8', 'Classic Veg Burger', 'Crispy vegetable patty with special sauce', 120.00, 120.00, 'Burgers', true, true, 35),
    (r3_id, 'm9', 'Chicken Deluxe', 'Grilled chicken patty with cheese and BBQ sauce', 180.00, 180.00, 'Burgers', false, true, 25),
    (r3_id, 'm10', 'French Fries', 'Crispy golden fries with seasoning', 80.00, 80.00, 'Sides', true, true, 60)
  ON CONFLICT (restaurant_id, external_id) DO NOTHING;

  -- Insert menu items for South Spice
  INSERT INTO public.menu_items (restaurant_id, external_id, name, description, price, original_price, category, is_veg, is_available, stock_level)
  VALUES
    (r4_id, 'm11', 'Masala Dosa', 'Crispy rice crepe with spiced potato filling', 90.00, 90.00, 'Main Course', true, true, 45),
    (r4_id, 'm12', 'Idli Sambar', 'Steamed rice cakes with lentil soup', 70.00, 70.00, 'Breakfast', true, true, 50)
  ON CONFLICT (restaurant_id, external_id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
