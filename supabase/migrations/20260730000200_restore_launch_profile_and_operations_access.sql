-- Restore the least-privilege writes used by current launch flows without
-- reopening role, email, wallet, or verification fields.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS roll_number TEXT,
  ADD COLUMN IF NOT EXISTS hall TEXT,
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS year_of_study TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS campus_email_verified BOOLEAN NOT NULL DEFAULT false;

GRANT UPDATE (
  full_name,
  avatar_url,
  roll_number,
  hall,
  room_number,
  department,
  year_of_study
) ON TABLE public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_user_profile_launch_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF auth.uid() = OLD.id AND NOT public.is_admin_user() THEN
    IF NULLIF(TRIM(OLD.roll_number), '') IS NOT NULL
       AND NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
      RAISE EXCEPTION 'roll number is locked after first save'
        USING ERRCODE = '42501';
    END IF;

    IF NULLIF(TRIM(OLD.department), '') IS NOT NULL
       AND NEW.department IS DISTINCT FROM OLD.department THEN
      RAISE EXCEPTION 'department is locked after first save'
        USING ERRCODE = '42501';
    END IF;

    IF NULLIF(TRIM(OLD.year_of_study), '') IS NOT NULL
       AND NEW.year_of_study IS DISTINCT FROM OLD.year_of_study THEN
      RAISE EXCEPTION 'year of study is locked after first save'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_user_profile_launch_fields()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_user_profile_launch_fields
  ON public.user_profiles;
CREATE TRIGGER enforce_user_profile_launch_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_profile_launch_fields();

DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at
  ON public.user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "admins_select_all_user_profiles"
  ON public.user_profiles;
CREATE POLICY "admins_select_all_user_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

-- These columns are consumed by the checked-in admin/vendor/rider pages.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS owner_id UUID
    REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id
  ON public.restaurants(owner_id);

DROP POLICY IF EXISTS "admins_manage_restaurants" ON public.restaurants;
CREATE POLICY "admins_manage_restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "vendors_update_owned_restaurants" ON public.restaurants;
CREATE POLICY "vendors_update_owned_restaurants"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles AS up
      WHERE up.id = (SELECT auth.uid())
        AND up.role::text = 'vendor'
    )
  )
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "admins_manage_menu_items" ON public.menu_items;
CREATE POLICY "admins_manage_menu_items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "vendors_manage_owned_menu_items" ON public.menu_items;
CREATE POLICY "vendors_manage_owned_menu_items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = (SELECT auth.uid())
    )
  );

GRANT INSERT, UPDATE, DELETE ON TABLE public.restaurants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.menu_items TO authenticated;

DROP POLICY IF EXISTS "admins_select_all_orders" ON public.orders;
CREATE POLICY "admins_select_all_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "vendors_select_owned_restaurant_orders"
  ON public.orders;
CREATE POLICY "vendors_select_owned_restaurant_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      WHERE r.id = orders.restaurant_id
        AND r.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "riders_select_ready_orders" ON public.orders;
CREATE POLICY "riders_select_ready_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    status = 'ready'::public.order_status
    AND rider_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles AS up
      WHERE up.id = (SELECT auth.uid())
        AND up.role::text = 'rider'
    )
  );
