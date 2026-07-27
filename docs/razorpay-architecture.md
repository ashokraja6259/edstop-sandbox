# Razorpay architecture and hardening model

## Scope and authority

This document covers the active Next.js App Router application. Code under
`archive/legacy` is not active. Food Razorpay remains disabled. The active
dark-store UI currently submits COD orders only; Razorpay endpoints are being
hardened for an API-level Test Mode pilot and are not a live-payment enablement.

Final authority is split deliberately:

- The authenticated callback provides immediate customer feedback.
- A signature-verified webhook is authoritative for provider reconciliation.
- Both paths converge on the same locked payment intent and the same atomic
  database finalizer.
- A backend-only reconciliation script resolves missed callbacks/webhooks and
  flags ambiguous states for manual review.

## Current architecture before this hardening

| Step | Location | Actor / trusted input | Writes and failure behavior |
|---|---|---|---|
| Dark-store cart | `src/app/dark-store-shopping/components/DarkStoreInteractive.tsx` | Authenticated browser; cart IDs and quantities | Active UI calls COD only. Razorpay routes are not called. |
| Trusted pricing | `src/lib/dark-store/pricing.ts` | Server-owned catalog in `src/lib/dark-store/catalog.ts` | Rejects unknown/out-of-stock products and calculates server prices. |
| COD order | `POST /api/dark-store/cod/create-order` | Authenticated user | Service role inserts order, then items, then event separately; partial-write risk exists but is outside this Razorpay-only change. |
| Razorpay order | `POST /api/dark-store/payment/create-order` | Authenticated user; item IDs/quantities and promo code | Calls Razorpay first, then inserts `payment_intents`. A database failure can orphan an external order. No idempotency key. |
| Browser checkout | No active client integration | None | Endpoint returns only public key ID plus provider order data. |
| Callback verification | `POST /api/dark-store/payment/verify` | Authenticated intent owner | Verifies callback HMAC and fetches provider order/payment. Inserts order, items, then updates intent separately. |
| Payment intent | `public.payment_intents`, migration `20260308000109` | Service-role routes; owner SELECT via RLS | Minimal `created`/`paid` state and provider IDs. No totals decomposition, expiry, internal order link, audit, or refund model. |
| Internal order | `public.orders`, `public.order_items`, `public.order_events` | Service role | Callback can leave an order without items or a captured payment without completed intent. |
| Wallet/ledger | `public.wallets`, `public.wallet_transactions` | Existing food atomic RPC only | Dark-store Razorpay has no mixed-wallet finalization. |
| Webhook | Missing | — | Captured payment cannot recover when callback/browser is lost. |
| Reconciliation | Missing | — | Stale or inconsistent intents are not repaired or flagged. |
| Refund | Missing | — | No bounded, idempotent refund record or webhook convergence. |

Food COD and wallet checkout use
`public.create_order_atomic(uuid,uuid,text,jsonb,numeric,text,text)` through
`POST /api/orders/create`. That function explicitly rejects Razorpay/online
payment methods and remains unchanged.

## Current-flow outcomes before hardening

| Scenario | Existing outcome and risk |
|---|---|
| Food COD / wallet-only | Atomic database RPC; idempotent checkout key; Razorpay disabled. |
| Dark-store COD | Works, but order/items/event are separate service-role writes. |
| Razorpay-only | Orphan external order possible; successful callback creates internal order. |
| Wallet + Razorpay | Not implemented. |
| Failed/uncaptured payment | Verification rejects; intent generally remains `created`. |
| Captured payment with callback failure/browser close | No webhook or reconciliation; captured money may have no order. |
| Duplicate callback/refresh | Returns conflict rather than the original completed result. |
| Duplicate/delayed/out-of-order webhook | No endpoint. |
| Double click/two tabs | Can create multiple provider orders and intents. |
| Same idempotency key | Creation endpoint has no idempotency key. |
| Different idempotency keys | Separate attempts, but not explicitly modelled. |
| Order/item/intent write failure after capture | Partial order or captured-without-order state; no repair path. |
| Refund/full/partial/duplicate | Unsupported and untracked. |

## Security findings

| Severity | Location | Finding, exploit/failure impact, recommended control |
|---|---|---|
| Critical | `payment/verify/route.ts` | Captured-payment finalization is three independent writes. A failure leaves captured funds without a complete order, or an order without items. Use one locked database transaction. |
| High | `payment/create-order/route.ts` | External order is created before the intent and requests have no idempotency key. Double clicks/tabs create duplicate attempts; database failure creates an orphan. Persist and atomically claim an intent first. |
| High | Missing webhook | Browser loss or callback failure strands captured payments. Add raw-body HMAC verification, event deduplication, and convergence on the finalizer. |
| High | Missing reconciliation | Missed/out-of-order events and post-capture failures cannot recover. Add a backend-only, dry-run-capable reconciler. |
| High | Missing refund model | No over-refund, duplicate-refund, or accounting protection. Add bounded refund records and provider-ID uniqueness. |
| High | `payment_intents` schema | No user idempotency constraint, internal order uniqueness, amount decomposition, expiry, or legal state transitions. Extend additively with constraints and audit. |
| Medium | Callback signature compare | Plain string comparison is not constant-time. Validate exact hex shape and use `timingSafeEqual`. |
| Medium | Payment endpoints | Unbounded JSON bodies and no per-user attempt limit permit abuse. Enforce content length, strict schemas, attempt windows, and external timeouts. |
| Medium | Environment handling | Test/live key mode is implicit and public key can fall back to a server key ID. Require explicit mode and matching key prefixes; never expose secrets. |
| Medium | Error handling | Some caught exception messages and provider descriptions are returned to clients. Return stable public errors; retain sanitized audit details server-side. |
| Informational | Trusted pricing | Dark-store pricing is server-owned static catalog data rather than browser prices. It is trusted but should eventually move to an operational database catalog. |

## Authoritative payment state machine

| State | Legal next states | Trigger authority |
|---|---|---|
| `created` | `pending`, `failed`, `cancelled`, `expired` | Intent endpoint / expiry job |
| `pending` | `razorpay_order_created`, `failed`, `manual_review`, `expired` | Razorpay order request / reconciliation |
| `razorpay_order_created` | `authorized`, `captured`, `verified`, `failed`, `expired`, `manual_review` | Verified provider API, webhook, reconciliation |
| `authorized` | `captured`, `failed`, `expired`, `manual_review` | Webhook/reconciliation |
| `captured` | `verified`, `order_created`, `refund_pending`, `manual_review` | Callback/webhook/reconciliation |
| `verified` | `order_created`, `manual_review` | Atomic finalizer |
| `order_created` | `refund_pending`, `partially_refunded`, `refunded`, `manual_review` | Trusted refund/reconciliation |
| `failed` | `manual_review` | Reconciliation only |
| `cancelled` / `expired` | `manual_review` | Reconciliation only if provider contradicts local state |
| `refund_pending` | `partially_refunded`, `refunded`, `refund_failed`, `manual_review` | Refund webhook/reconciliation |
| `partially_refunded` | `refund_pending`, `refunded`, `manual_review` | Trusted refund flow |
| `refund_failed` | `refund_pending`, `manual_review` | Trusted retry |
| `refunded` | none | Terminal |
| `manual_review` | any explicitly reconciled forward state | Trusted backend/admin only |

Duplicate transitions to the current state are idempotent. Completed states
never regress. Every transition writes `payment_intent_audit`.

## Accounting model

All amounts are stored as integer paise. Rupee inputs are accepted only when
they convert to an exact, non-negative integer number of paise.

```text
total_amount_paise
= discount_amount_paise
 + wallet_amount_paise
 + razorpay_amount_paise
```

The finalizer checks that the provider captured exactly
`razorpay_amount_paise` in INR. Wallet balance is locked and deducted only in
the same transaction that creates the internal order, order items, ledger
entry, audit event, and final intent link. Replay returns the existing order.

## Refund and reconciliation design

Refund requests originate only from an authenticated admin or trusted backend.
The server calculates remaining refundable Razorpay funds from captured amount
minus successful/pending refunds. A unique `(payment_intent_id,
idempotency_key)` and unique provider refund ID make retries harmless. Wallet
restoration is not performed for a Razorpay refund because the wallet portion
was not sent to Razorpay; any wallet-credit restoration requires a separate
explicit accounting decision and idempotent ledger record.

`scripts/reconcile-razorpay.mjs` is backend-only. It requires service-role and
Razorpay server credentials, defaults to dry-run, fetches provider state,
completes safe forward transitions through trusted database functions, and
marks irreconcilable differences `manual_review`. It is never exposed as a
public HTTP endpoint.
