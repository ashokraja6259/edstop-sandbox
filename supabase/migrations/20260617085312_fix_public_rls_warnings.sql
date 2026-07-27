-- Fix Supabase rls_disabled_in_public warnings for optional operational tables.
-- These tables exist in some deployed environments but are not created by this
-- repository's migration history. Preserve their hardening without making a
-- clean install depend on manually-created schema.

DO $optional_rls$
DECLARE
  v_table text;
  v_policy text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'delivery_hubs',
    'delivery_points',
    'delivery_zones',
    'menu_categories',
    'menu_item_variants'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE WARNING
        'optional relation public.% is absent; RLS and policies were not applied',
        v_table;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      v_table
    );

    v_policy := CASE v_table
      WHEN 'delivery_hubs' THEN 'Public can view delivery hubs'
      WHEN 'delivery_points' THEN 'Public can view delivery points'
      WHEN 'delivery_zones' THEN 'Public can view delivery zones'
      WHEN 'menu_categories' THEN 'Public can view menu categories'
      WHEN 'menu_item_variants' THEN 'Public can view menu item variants'
    END;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_policy,
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR SELECT TO anon, authenticated USING (true)',
      v_policy,
      v_table
    );

    v_policy := CASE v_table
      WHEN 'delivery_hubs' THEN 'Admins can manage delivery hubs'
      WHEN 'delivery_points' THEN 'Admins can manage delivery points'
      WHEN 'delivery_zones' THEN 'Admins can manage delivery zones'
      WHEN 'menu_categories' THEN 'Admins can manage menu categories'
      WHEN 'menu_item_variants' THEN 'Admins can manage menu item variants'
    END;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_policy,
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR ALL TO authenticated
       USING (public.is_admin_user())
       WITH CHECK (public.is_admin_user())',
      v_policy,
      v_table
    );
  END LOOP;

  FOREACH v_table IN ARRAY ARRAY[
    'restaurant_settlements',
    'rider_settlements',
    'riders'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE WARNING
        'optional relation public.% is absent; RLS and policies were not applied',
        v_table;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      v_table
    );

    v_policy := CASE v_table
      WHEN 'restaurant_settlements' THEN 'Admins can manage restaurant settlements'
      WHEN 'rider_settlements' THEN 'Admins can manage rider settlements'
      WHEN 'riders' THEN 'Admins can manage riders'
    END;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_policy,
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR ALL TO authenticated
       USING (public.is_admin_user())
       WITH CHECK (public.is_admin_user())',
      v_policy,
      v_table
    );
  END LOOP;

  IF to_regclass('public.dispatch_queue') IS NULL THEN
    RAISE WARNING
      'optional relation public.dispatch_queue is absent; RLS and policies were not applied';
  ELSE
    ALTER TABLE public.dispatch_queue ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins can manage dispatch queue"
      ON public.dispatch_queue;
    CREATE POLICY "Admins can manage dispatch queue"
      ON public.dispatch_queue
      FOR ALL
      TO authenticated
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user());

    DROP POLICY IF EXISTS "Riders and admins can view dispatch queue"
      ON public.dispatch_queue;
    CREATE POLICY "Riders and admins can view dispatch queue"
      ON public.dispatch_queue
      FOR SELECT
      TO authenticated
      USING (
        public.is_admin_user()
        OR EXISTS (
          SELECT 1
          FROM public.user_profiles
          WHERE id = auth.uid()
            AND role = 'rider'
        )
      );
  END IF;
END;
$optional_rls$;
