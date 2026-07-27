-- Fix Supabase Security Definer View warnings where optional analytics views
-- exist. None of these views is created by repository migration history.

DO $optional_views$
DECLARE
  v_view text;
  v_relation regclass;
  v_kind "char";
BEGIN
  FOREACH v_view IN ARRAY ARRAY[
    'rider_weekly_payout',
    'admin_monthly_profit',
    'admin_weekly_restaurant_settlement',
    'admin_platform_overview',
    'admin_monthly_revenue',
    'admin_cashflow_summary',
    'admin_profit_overview',
    'rider_pending_settlements',
    'admin_weekly_rider_payout',
    'admin_top_restaurants',
    'restaurant_weekly_payout',
    'admin_revenue_growth',
    'admin_commission_overview',
    'admin_growth_metrics',
    'user_order_analytics',
    'restaurant_menu_view',
    'rider_earnings_per_order',
    'restaurant_pending_settlements',
    'admin_financial_breakdown',
    'rider_lifetime_summary',
    'monthly_platform_revenue',
    'admin_rider_payout_summary',
    'admin_daily_revenue',
    'admin_platform_profit',
    'admin_financial_summary'
  ]
  LOOP
    v_relation := to_regclass(format('public.%I', v_view));

    IF v_relation IS NULL THEN
      RAISE WARNING
        'optional view public.% is absent; security_invoker was not applied',
        v_view;
      CONTINUE;
    END IF;

    SELECT c.relkind
    INTO v_kind
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = v_relation;

    IF v_kind <> 'v' THEN
      RAISE EXCEPTION
        'public.% exists but is not a view; refusing ALTER VIEW',
        v_view;
    END IF;

    EXECUTE format(
      'ALTER VIEW public.%I SET (security_invoker = true)',
      v_view
    );
  END LOOP;
END;
$optional_views$;
