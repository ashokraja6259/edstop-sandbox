-- Fix Supabase Security Definer View warnings
-- Makes views respect permissions/RLS of the querying user.

alter view public.rider_weekly_payout set (security_invoker = true);
alter view public.admin_monthly_profit set (security_invoker = true);
alter view public.admin_weekly_restaurant_settlement set (security_invoker = true);
alter view public.admin_platform_overview set (security_invoker = true);
alter view public.admin_monthly_revenue set (security_invoker = true);
alter view public.admin_cashflow_summary set (security_invoker = true);
alter view public.admin_profit_overview set (security_invoker = true);
alter view public.rider_pending_settlements set (security_invoker = true);
alter view public.admin_weekly_rider_payout set (security_invoker = true);
alter view public.admin_top_restaurants set (security_invoker = true);
alter view public.restaurant_weekly_payout set (security_invoker = true);
alter view public.admin_revenue_growth set (security_invoker = true);
alter view public.admin_commission_overview set (security_invoker = true);
alter view public.admin_growth_metrics set (security_invoker = true);
alter view public.user_order_analytics set (security_invoker = true);
alter view public.restaurant_menu_view set (security_invoker = true);
alter view public.rider_earnings_per_order set (security_invoker = true);
alter view public.restaurant_pending_settlements set (security_invoker = true);
alter view public.admin_financial_breakdown set (security_invoker = true);
alter view public.rider_lifetime_summary set (security_invoker = true);
alter view public.monthly_platform_revenue set (security_invoker = true);
alter view public.admin_rider_payout_summary set (security_invoker = true);
alter view public.admin_daily_revenue set (security_invoker = true);
alter view public.admin_platform_profit set (security_invoker = true);
alter view public.admin_financial_summary set (security_invoker = true);