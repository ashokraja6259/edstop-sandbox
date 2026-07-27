-- This RPC exists only in some deployed schemas. Restrict it when present.
DO $optional_rider_payout$
BEGIN
  IF to_regprocedure(
    'public.mark_rider_payout_paid(uuid,timestamp with time zone,numeric)'
  ) IS NULL THEN
    RAISE WARNING
      'optional function public.mark_rider_payout_paid(uuid,timestamp with time zone,numeric) is absent; revoke was not applied';
  ELSE
    REVOKE EXECUTE ON FUNCTION public.mark_rider_payout_paid(
      uuid,
      timestamp with time zone,
      numeric
    ) FROM authenticated;
  END IF;
END;
$optional_rider_payout$;
