-- READ ONLY. Run before deciding whether any historical identity is disposable.
SELECT
  u.id,
  u.email,
  u.created_at AS auth_created_at,
  up.role,
  (SELECT count(*) FROM public.wallets w WHERE w.user_id = u.id) AS wallet_rows,
  (SELECT count(*) FROM public.transactions t WHERE t.user_id = u.id) AS transaction_rows,
  (SELECT count(*) FROM public.wallet_transactions wt WHERE wt.user_id = u.id) AS wallet_transaction_rows,
  (SELECT count(*) FROM public.orders o WHERE o.user_id = u.id OR o.rider_id = u.id) AS related_order_rows,
  (SELECT count(*) FROM public.student_profiles sp WHERE sp.user_id = u.id) AS student_profile_rows,
  (SELECT count(*) FROM public.audit_logs al WHERE al.user_id = u.id) AS audit_log_rows
FROM auth.users AS u
LEFT JOIN public.user_profiles AS up ON up.id = u.id
WHERE lower(u.email) IN ('student@example.com', 'rider@example.com', 'admin@example.com')
ORDER BY u.email;
