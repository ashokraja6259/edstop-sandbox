-- Close every anonymous function entry point before restoring public menu
-- reads. Function-body authorization is not treated as an anonymous boundary.

DO $required_surface$
BEGIN
  IF to_regclass('public.restaurants') IS NULL
     OR to_regclass('public.menu_items') IS NULL THEN
    RAISE EXCEPTION
      'public restaurant/menu relations are required';
  END IF;
END;
$required_surface$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Repository-backed authenticated RPCs.
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_user_role(
  UUID, public.user_role
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(
  TEXT, NUMERIC, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(
  UUID, UUID, TEXT, JSONB, NUMERIC, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_update_order_status(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_claim_order(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_mark_delivered(UUID)
  TO authenticated;

-- Trusted backend-only payment and COD entry points.
GRANT EXECUTE ON FUNCTION public.create_dark_store_cod_order(
  UUID, JSONB, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_razorpay_payment(
  UUID, TEXT, BIGINT, TEXT, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_razorpay_refund(
  UUID, UUID, TEXT, BIGINT
) TO service_role;

-- Production currently has this application-called notification RPC outside
-- repository provenance. Preserve authenticated access only when the exact
-- audited signature exists. Assignment, settlement, retry, wallet, ledger,
-- and trigger functions intentionally receive no client grant.
DO $optional_authenticated_rpc$
BEGIN
  IF to_regprocedure(
    'public.create_user_notification(uuid,text,text,text,text)'
  ) IS NOT NULL THEN
    EXECUTE
      'GRANT EXECUTE ON FUNCTION public.create_user_notification(
         UUID, TEXT, TEXT, TEXT, TEXT
       ) TO authenticated';
  END IF;
END;
$optional_authenticated_rpc$;

-- Remove inherited or direct anonymous table access, then restore exactly the
-- two intended read-only surfaces.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.restaurants, public.menu_items TO anon;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view restaurants"
  ON public.restaurants;
DROP POLICY IF EXISTS "public_read_restaurants"
  ON public.restaurants;
DROP POLICY IF EXISTS "anon_read_active_open_restaurants"
  ON public.restaurants;
CREATE POLICY "anon_read_active_open_restaurants"
  ON public.restaurants
  FOR SELECT
  TO anon
  USING (
    is_available IS TRUE
    AND is_active IS TRUE
    AND is_open IS TRUE
  );

DROP POLICY IF EXISTS "Public view menu"
  ON public.menu_items;
DROP POLICY IF EXISTS "public_read_menu_items"
  ON public.menu_items;
DROP POLICY IF EXISTS "anon_read_available_menu_items"
  ON public.menu_items;
CREATE POLICY "anon_read_available_menu_items"
  ON public.menu_items
  FOR SELECT
  TO anon
  USING (
    is_available IS TRUE
    AND EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      WHERE r.id = menu_items.restaurant_id
        AND r.is_available IS TRUE
        AND r.is_active IS TRUE
        AND r.is_open IS TRUE
    )
  );
