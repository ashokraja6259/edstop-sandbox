-- EXPLICIT ADMIN OPERATION; never run as part of a migration.
-- Run the audit first, take a backup, and review every candidate.
BEGIN;

DO $cleanup$
DECLARE
  v_confirmation text := current_setting('edstop.confirm_seed_cleanup', true);
BEGIN
  IF v_confirmation <> 'DELETE REVIEWED EMPTY HISTORICAL SEEDS' THEN
    RAISE EXCEPTION
      'cleanup not confirmed; SET LOCAL edstop.confirm_seed_cleanup to the documented phrase';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE lower(u.email) IN ('student@example.com', 'rider@example.com', 'admin@example.com')
      AND (
        EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id)
        OR EXISTS (SELECT 1 FROM public.transactions t WHERE t.user_id = u.id)
        OR EXISTS (SELECT 1 FROM public.wallet_transactions wt WHERE wt.user_id = u.id)
        OR EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = u.id OR o.rider_id = u.id)
        OR EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.user_id = u.id)
        OR EXISTS (SELECT 1 FROM public.audit_logs al WHERE al.user_id = u.id)
      )
  ) THEN
    RAISE EXCEPTION 'cleanup refused: at least one candidate has linked activity';
  END IF;
  DELETE FROM auth.users AS u
  WHERE lower(u.email) IN ('student@example.com', 'rider@example.com', 'admin@example.com');
END;
$cleanup$;

COMMIT;
