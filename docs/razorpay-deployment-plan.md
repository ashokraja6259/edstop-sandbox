# Razorpay hardening deployment plan

This change does **not** enable Razorpay in production. Food online payment
remains disabled, and the dark-store UI remains COD-only.

## Required order

1. Apply `20260727000300_harden_razorpay_lifecycle.sql` to a new disposable
   Supabase project containing the full migration history.
2. Run `supabase/tests/production_security_gate.sql` and
   `supabase/tests/razorpay_security_gate.sql` in transactions that roll back.
3. Repeat against a disposable upgrade copy created from the schema immediately
   before this migration, including representative orders, wallets, ledger
   entries, and legacy payment intents.
4. Configure Test Mode credentials only: `RAZORPAY_MODE=test`, a matching
   `rzp_test_` key pair, a distinct webhook secret, and the Supabase service-role
   key in server-only secret storage.
5. Register `/api/razorpay/webhook` for payment, order, and refund events.
6. Exercise the manual Test Mode matrix and reconciliation in dry-run mode.
7. Deploy server code with customer-facing online-payment controls disabled.
8. Enable a limited Test Mode cohort only after the evidence is reviewed.
9. Live Mode requires a separate approval and configuration change.

## Pre-deployment gates

- Full clean migration history succeeds without manual SQL.
- Existing-database upgrade succeeds and preserves existing data.
- Both SQL security gates pass.
- Install, payment tests, typecheck, lint, build, and dependency audit pass.
- Callback, webhook, and reconciliation converge to one internal order.
- Duplicate create, callback, webhook, and refund operations are idempotent.
- Mixed wallet/Razorpay accounting balances exactly in paise.
- No secret, raw provider payload, or sensitive database credential appears in
  a client response or log.

## Rollback and emergency controls

- Keep online-payment UI controls disabled; this is the primary kill switch.
- Stop webhook delivery, reconciliation, and refund operations if their behavior
  is under investigation, accounting for Razorpay webhook retries.
- Never reverse captured payments by deleting intents, orders, wallet ledger,
  audit, or webhook rows.
- Do not drop additive columns after they contain payment history. Roll server
  traffic back to the previous build while retaining schema and audit data.
- Put ambiguous captures in `manual_review`, reconcile them, and refund through
  the idempotent refund workflow where appropriate.
- Rotate any credential suspected of exposure and keep Test/Live keys isolated.

## Monitoring

Alert on stale payment/refund states, every `manual_review` transition, webhook
failures, captures without internal orders, paid orders without captures,
amount/currency mismatches, and refund totals near the captured amount.

Reconciliation defaults to dry-run:

```bash
npm run reconcile:razorpay
```

State-changing reconciliation requires the explicit `--apply` flag and a
reviewed server-only environment.
