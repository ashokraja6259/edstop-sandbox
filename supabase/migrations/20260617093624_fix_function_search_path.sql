-- Fix function_search_path_mutable warnings.
-- Repository-owned functions are mandatory. Functions that only exist in some
-- deployed environments remain optional and are hardened when present.

DO $function_search_paths$
DECLARE
  v_signature text;
  v_required boolean;
BEGIN
  FOR v_signature, v_required IN
    SELECT *
    FROM (
      VALUES
        ('public.assign_rider_atomic(uuid)', false),
        ('public.batch_assign_orders(uuid)', false),
        ('public.create_order_atomic(uuid,uuid,text,jsonb,numeric,text,text)', true),
        ('public.create_wallet_for_user()', true),
        ('public.generate_weekly_restaurant_settlement()', false),
        ('public.get_user_role(uuid)', true),
        ('public.handle_new_user()', true),
        ('public.is_admin_user()', true),
        ('public.log_table_mutation()', true),
        ('public.mark_rider_payout_paid(uuid,timestamp with time zone,numeric)', false),
        ('public.retry_dispatch_ready_orders()', false),
        ('public.set_lost_found_updated_at()', true),
        ('public.set_marketplace_updated_at()', true),
        ('public.update_ai_usage_updated_at()', true),
        ('public.update_food_ordering_updated_at()', true),
        ('public.update_updated_at_column()', true),
        ('public.update_wallet_balance()', true),
        ('public.validate_promo_code(text,numeric,text)', true)
    ) AS functions(signature, required)
  LOOP
    IF to_regprocedure(v_signature) IS NULL THEN
      IF v_required THEN
        RAISE EXCEPTION
          'required function % is missing; migration history is incomplete',
          v_signature;
      END IF;

      RAISE WARNING
        'optional function % is absent; search_path was not changed',
        v_signature;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, extensions',
      v_signature
    );
  END LOOP;
END;
$function_search_paths$;
