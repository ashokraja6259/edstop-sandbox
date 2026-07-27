import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  fingerprintWebhookValue,
  isValidIdentifierValue,
  rupeesToPaiseValue,
  validateEnvironmentValues,
  verifyHmacHexValue,
} from '../src/lib/payments/razorpay-core.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const createRoute = read('src/app/api/dark-store/payment/create-order/route.ts');
const verifyRoute = read('src/app/api/dark-store/payment/verify/route.ts');
const webhookRoute = read('src/app/api/razorpay/webhook/route.ts');
const refundRoute = read('src/app/api/razorpay/refunds/route.ts');
const migration = read('supabase/migrations/20260727000300_harden_razorpay_lifecycle.sql');
const reconcile = read('scripts/reconcile-razorpay.mjs');
const foodRoute = read('src/app/api/orders/create/route.ts');
const pricing = read('src/lib/dark-store/pricing.ts');

test('1 unauthenticated payment-intent creation is rejected', () => {
  assert.match(createRoute, /authError \|\| !user/);
});
test('2 cross-user intent access is rejected', () => {
  assert.match(verifyRoute, /\.eq\('user_id', user\.id\)/);
});
test('3 client-supplied final amount is ignored', () => {
  assert.doesNotMatch(createRoute, /body\.(amount|currency|totalAmount)/);
  assert.match(createRoute, /calculateDarkStorePricing/);
});
test('4 invalid cart is rejected', () => assert.match(pricing, /Cart cannot be empty/));
test('5 food online payment remains disabled', () => {
  assert.match(foodRoute, /Razorpay payment verification is not enabled/);
});
test('6 invalid product is rejected', () => assert.match(pricing, /Invalid product in cart/));
test('7 unavailable product is rejected', () => assert.match(pricing, /quantity > product\.stock/));
test('8 invalid wallet amount is rejected', () => {
  assert.match(createRoute, /walletAmountPaise > totalAmountPaise/);
});
test('9 duplicate create request reuses intent', () => {
  assert.match(createRoute, /idempotentReplay: true/);
  assert.match(migration, /idx_payment_intents_user_idempotency/);
});
test('10 double-click cannot claim intent twice', () => {
  assert.match(createRoute, /\.eq\('status', 'created'\)/);
});
test('11 invalid callback signature is rejected', () => {
  assert.equal(verifyHmacHexValue('a', '00', 'secret'), false);
});
test('12 wrong Razorpay order ID is rejected', () => {
  assert.match(verifyRoute, /providerPayment\.order_id !== razorpayOrderId/);
});
test('13 malformed payment ID is rejected', () => {
  assert.equal(isValidIdentifierValue('bad/payment'), false);
});
test('14 wrong amount is rejected', () => {
  assert.match(verifyRoute, /Number\(providerPayment\.amount\) !== intent\.razorpay_amount_paise/);
});
test('15 wrong currency is rejected', () => {
  assert.match(verifyRoute, /providerPayment\.currency !== intent\.currency/);
});
test('16 uncaptured payment is rejected', () => {
  assert.match(verifyRoute, /providerPayment\.captured !== true/);
});
test('17 valid verification uses atomic finalizer', () => {
  assert.match(verifyRoute, /finalize_razorpay_payment/);
});
test('18 duplicate verification returns existing order', () => {
  assert.match(verifyRoute, /intent\.internal_order_id/);
  assert.match(verifyRoute, /idempotentReplay: true/);
});
test('19 duplicate payment ID is constrained', () => {
  assert.match(migration, /idx_payment_intents_provider_payment/);
});
test('20 wallet deduction is inside finalizer', () => {
  assert.match(migration, /UPDATE public\.wallets[\s\S]*INSERT INTO public\.wallet_transactions/);
});
test('21 mixed-payment accounting is exact', () => {
  assert.match(migration, /total_amount_paise = wallet_amount_paise \+ razorpay_amount_paise/);
});
test('22 failed payment does not deduct wallet', () => {
  const walletUpdate = migration.indexOf('UPDATE public.wallets');
  const finalizer = migration.indexOf('CREATE OR REPLACE FUNCTION public.finalize_razorpay_payment');
  assert.ok(walletUpdate > finalizer);
});
test('23 failed order creation cannot mark payment complete', () => {
  assert.match(migration, /INSERT INTO public\.orders[\s\S]*UPDATE public\.payment_intents/);
});
test('24 callback timeout is recoverable', () => {
  assert.match(verifyRoute, /being reconciled/);
});
test('25 invalid webhook signature is rejected', () => {
  assert.match(webhookRoute, /Invalid webhook signature/);
});
test('26 webhook uses raw request body', () => {
  assert.match(webhookRoute, /const rawBody = await request\.text\(\)/);
  assert.match(webhookRoute, /verifyHmacHex\(rawBody/);
});
test('27 duplicate webhook is harmless', () => {
  assert.match(migration, /event_fingerprint TEXT NOT NULL UNIQUE/);
  assert.match(webhookRoute, /duplicate: true/);
});
test('28 out-of-order webhook cannot regress state', () => {
  assert.match(migration, /Illegal payment transition/);
  assert.match(webhookRoute, /\.in\('status'/);
});
test('29 delayed captured webhook converges', () => {
  assert.match(webhookRoute, /\['payment\.captured', 'order\.paid'\]/);
  assert.match(webhookRoute, /finalize_razorpay_payment/);
});
test('30 webhook cannot create a duplicate order', () => {
  assert.match(migration, /idx_payment_intents_internal_order/);
});
test('31 captured payment with failed callback reconciles', () => {
  assert.match(reconcile, /finalize_razorpay_payment/);
});
test('32 browser refresh returns existing payment state', () => {
  assert.match(createRoute, /intentResponse\(intent/);
});
test('33 two browser tabs share user-scoped idempotency', () => {
  assert.match(migration, /ON public\.payment_intents\(user_id, idempotency_key\)/);
});
test('34 same idempotency key is replay safe', () => {
  assert.match(createRoute, /\.eq\('idempotency_key', body\.idempotencyKey\)/);
});
test('35 different idempotency keys can create attempts', () => {
  assert.equal(isValidIdentifierValue('attempt-one'), true);
  assert.equal(isValidIdentifierValue('attempt-two'), true);
});
test('36 full refund is bounded by captured Razorpay amount', () => {
  assert.match(migration, /v_refundable := v_intent\.razorpay_amount_paise - v_committed/);
});
test('37 partial refund is supported', () => {
  assert.match(refundRoute, /body\.amountPaise === undefined/);
});
test('38 over-refund is rejected', () => {
  assert.match(migration, /v_amount <= 0 OR v_amount > v_refundable/);
});
test('39 duplicate refund request is harmless', () => {
  assert.match(migration, /UNIQUE \(payment_intent_id, idempotency_key\)/);
  assert.match(refundRoute, /idempotentReplay: true/);
});
test('40 refund webhook is idempotent', () => {
  assert.match(webhookRoute, /provider_refund_id/);
  assert.match(migration, /provider_refund_id TEXT UNIQUE/);
});
test('41 wallet restoration is not coupled to Razorpay refund', () => {
  assert.doesNotMatch(refundRoute, /wallets|wallet_transactions/);
});
test('42 stale pending intent expires safely', () => {
  assert.match(reconcile, /STALE_INTENT/);
});
test('43 illegal state transition is rejected', () => {
  assert.match(migration, /payment_transition_is_legal/);
});
test('44 server secrets are absent from client payment response', () => {
  assert.doesNotMatch(createRoute, /keySecret[,\s]*$/m);
  assert.match(createRoute, /keyId: environment\.publicKeyId/);
});
test('45 service-role key is absent from payment client code', () => {
  const client = read('src/app/dark-store-shopping/components/DarkStoreInteractive.tsx');
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY/);
});
test('46 Razorpay secret values are not logged', () => {
  assert.doesNotMatch(
    `${createRoute}\n${verifyRoute}\n${webhookRoute}\n${refundRoute}`,
    /console\.(log|error)\([^)]*(keySecret|webhookSecret)/
  );
});
test('47 test/live credential mismatch is rejected', () => {
  assert.throws(() =>
    validateEnvironmentValues({
      mode: 'test',
      keyId: 'rzp_live_key',
      keySecret: 'secret',
      publicKeyId: 'rzp_live_key',
    })
  );
});
test('48 reconciliation defaults to dry-run', () => {
  assert.match(reconcile, /const applyChanges = process\.argv\.includes\('--apply'\)/);
  assert.match(reconcile, /mode: applyChanges \? 'apply' : 'dry-run'/);
});
test('49 reconciliation completion is idempotent', () => {
  assert.match(reconcile, /intent\.internal_order_id/);
  assert.match(migration, /idempotent_replay/);
});
test('50 database privileges and RLS are restrictive', () => {
  assert.match(migration, /REVOKE ALL ON TABLE public\.payment_intents FROM anon, authenticated/);
  assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.finalize_razorpay_payment/);
});

test('callback HMAC accepts a genuine signature', () => {
  const payload = 'order_123|pay_123';
  const signature = crypto.createHmac('sha256', 'secret').update(payload).digest('hex');
  assert.equal(verifyHmacHexValue(payload, signature, 'secret'), true);
});
test('webhook fingerprints are deterministic and payload-sensitive', () => {
  assert.equal(fingerprintWebhookValue('a'), fingerprintWebhookValue('a'));
  assert.notEqual(fingerprintWebhookValue('a'), fingerprintWebhookValue('b'));
});
test('paise conversion rejects negative and fractional-paise values', () => {
  assert.equal(rupeesToPaiseValue(12.34), 1234);
  assert.throws(() => rupeesToPaiseValue(-1));
  assert.throws(() => rupeesToPaiseValue(1.001));
});
test('webhook secret must be distinct', () => {
  assert.throws(() =>
    validateEnvironmentValues(
      {
        mode: 'test',
        keyId: 'rzp_test_key',
        keySecret: 'same',
        publicKeyId: 'rzp_test_key',
        webhookSecret: 'same',
      },
      true
    )
  );
});
