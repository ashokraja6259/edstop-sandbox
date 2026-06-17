-- Fix function_search_path_mutable warnings
-- Locks function name resolution to trusted schemas.

alter function public.assign_rider_atomic(uuid)
set search_path = public, extensions;

alter function public.batch_assign_orders(uuid)
set search_path = public, extensions;

alter function public.create_order_atomic(uuid, uuid, text, jsonb, numeric, text, text)
set search_path = public, extensions;

alter function public.create_wallet_for_user()
set search_path = public, extensions;

alter function public.generate_weekly_restaurant_settlement()
set search_path = public, extensions;

alter function public.get_user_role(uuid)
set search_path = public, extensions;

alter function public.handle_new_user()
set search_path = public, extensions;

alter function public.is_admin_user()
set search_path = public, extensions;

alter function public.log_table_mutation()
set search_path = public, extensions;

alter function public.mark_rider_payout_paid(uuid, timestamp with time zone, numeric)
set search_path = public, extensions;

alter function public.retry_dispatch_ready_orders()
set search_path = public, extensions;

alter function public.set_lost_found_updated_at()
set search_path = public, extensions;

alter function public.set_marketplace_updated_at()
set search_path = public, extensions;

alter function public.update_ai_usage_updated_at()
set search_path = public, extensions;

alter function public.update_food_ordering_updated_at()
set search_path = public, extensions;

alter function public.update_updated_at_column()
set search_path = public, extensions;

alter function public.update_wallet_balance()
set search_path = public, extensions;

alter function public.validate_promo_code(text, numeric, text)
set search_path = public, extensions;