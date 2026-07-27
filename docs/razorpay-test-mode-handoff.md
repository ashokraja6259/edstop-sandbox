# Razorpay Test Mode handoff

This procedure is for the approved dark-store Test Mode pilot only. Food online
payments and Razorpay Live Mode remain disabled.

## Enable

Configure these values in the non-production Vercel environment without
printing or committing them:

- `RAZORPAY_MODE=test`
- `RAZORPAY_KEY_ID` (Test Mode)
- `RAZORPAY_KEY_SECRET` (server-only)
- `RAZORPAY_WEBHOOK_SECRET` (server-only and different from the API secret)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` (must equal the server key ID)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RAZORPAY_TEST_CHECKOUT_ENABLED=true`
- `RAZORPAY_TEST_USER_IDS` (comma-separated approved authenticated user UUIDs)

Redeploy the preview after changing values. Protected-database admins are also
eligible while the flag is enabled. Everyone else continues to see COD only and
receives HTTP 403 from payment creation/verification.

## Disable

Remove `RAZORPAY_TEST_CHECKOUT_ENABLED` or set it to any value other than the
exact string `true`, then redeploy. This hides the test option and causes the
server endpoints to reject creation and verification. Revoking the Test Mode
webhook and keys is a separate dashboard action.

## Dashboard

- Select Razorpay **Test Mode**.
- Use automatic capture.
- Webhook URL:
  `https://<preview-host>/api/razorpay/webhook`
- Subscribe to `payment.authorized`, `payment.captured`, `payment.failed`,
  `order.paid`, `refund.created`, `refund.processed`, and `refund.failed`.
- Configure the same distinct webhook secret in Razorpay and Vercel.
- Do not configure the webhook as a browser callback URL.

## Manual matrix

For each case record the intent, provider order/payment/refund identifiers,
internal order count, wallet balance, wallet-ledger count, refund count, and
final state. `B0` is the wallet balance before the test and `W` is the wallet
portion.

| # | Scenario and action | Expected HTTP | Payment state | Order | Wallet / ledger | Refunds / Razorpay | UI |
|---|---|---|---|---:|---|---|---|
| 1 | Successful checkout | create 200/201; verify 200 | `order_created` | 1 | `B0`; 0 | payment captured; 0 refunds | success with internal order ID |
| 2 | Failed checkout | provider/verify failure, never success | `failed` or recoverable review | 0 | `B0`; 0 | one failed payment attempt | failed/retry |
| 3 | Double-click same button | both converge to existing intent | forward-only | ≤1 | at most one deduction/ledger | one provider order | one Checkout/result |
| 4 | Replay identical callback | 200 with same order | `order_created` | 1 | unchanged on replay | one payment | same success |
| 5 | Deliver webhook | 200 | converges forward | 1 after capture | exact once | one event outcome | success after refresh |
| 6 | Replay signed webhook | 200/idempotent | unchanged | 1 | unchanged | one logical event | unchanged |
| 7 | Delay webhook | callback or later webhook converges | `order_created` | 1 | exact once | one payment | pending then success |
| 8 | Close browser after provider payment | webhook/reconcile recovers | `order_created` or review pending evidence | ≤1 | exact once | one payment | refresh resumes existing attempt |
| 9 | Refresh with stored cart attempt | create replay 200 | existing state | ≤1 | unchanged | existing provider order | resumes Checkout or result |
| 10 | Full refund | refund 200 | `refunded` | 1 | unchanged; 0 refund wallet ledger by policy | one full refund | refunded |
| 11 | Partial refund | refund 200 | `partially_refunded` | 1 | unchanged | one exact partial refund | partial amount shown |
| 12 | Duplicate same-key refund | 200 with original refund | unchanged | 1 | unchanged | one refund/provider call | original result |
| 13 | Provider timeout after refund claim | 503 then same-key replay returns original review record | `manual_review` until webhook | 1 | unchanged | at most one provider refund | review/pending, never retry as new |
| 14 | Wallet `W` + Razorpay | create/verify 200 | `order_created` | 1 | `B0-W`; 1 debit ledger | one captured payment | split amounts total exactly |
| 15 | Reconciliation dry run | command success; no writes | unchanged | unchanged | unchanged | no provider writes | operations report only |
| 16 | Approved reconciliation apply | command success | converged, expired, or review | ≤1 per intent | at most one debit/ledger | no duplicates | refresh reflects result |

Do not claim provider success until all rows are executed with real Test Mode
credentials and the database evidence is reviewed.
