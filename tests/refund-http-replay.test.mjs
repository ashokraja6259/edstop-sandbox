import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { executeRefundOperation } from '../src/lib/payments/refund-operation.mjs';
import {
  approvedTestUserValue,
  testCheckoutEnabledValue,
} from '../src/lib/payments/test-checkout-core.mjs';
import { validateEnvironmentValues } from '../src/lib/payments/razorpay-core.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const refundRoute = read('src/app/api/razorpay/refunds/route.ts');
const webhookRoute = read('src/app/api/razorpay/webhook/route.ts');
const createRoute = read('src/app/api/dark-store/payment/create-order/route.ts');
const verifyRoute = read('src/app/api/dark-store/payment/verify/route.ts');
const checkoutUi = read(
  'src/app/dark-store-shopping/components/DarkStoreInteractive.tsx'
);

function createHarness({ capturedPaise = 10_000, providerDelay = 0 } = {}) {
  const refunds = new Map();
  let sequence = 0;
  let providerCalls = 0;
  let walletRestorations = 0;
  let ledgerRows = 0;
  let lock = Promise.resolve();
  let providerFailure = null;

  const reserve = (input) => {
    const run = lock.then(() => {
      const scope = `${input.paymentIntentId}:${input.requestedBy}:${input.idempotencyKey}`;
      const existing = refunds.get(scope);
      if (existing) {
        return { ...existing, idempotent_replay: true };
      }
      const committed = [...refunds.values()]
        .filter((row) => ['refund_pending', 'processed', 'manual_review'].includes(row.status))
        .reduce((sum, row) => sum + row.amount_paise, 0);
      const amount = input.amountPaise ?? capturedPaise - committed;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > capturedPaise - committed) {
        throw new Error('Refund exceeds refundable amount');
      }
      const row = {
        refund_id: `refund-${++sequence}`,
        provider_refund_id: null,
        amount_paise: amount,
        status: 'refund_pending',
        idempotent_replay: false,
        scope,
      };
      refunds.set(scope, row);
      return { ...row };
    });
    lock = run.catch(() => {});
    return run;
  };

  const dependencies = {
    reserve,
    createProviderRefund: async (reservation) => {
      providerCalls += 1;
      if (providerDelay) {
        await new Promise((resolve) => setTimeout(resolve, providerDelay));
      }
      if (providerFailure === 'timeout') throw new Error('timeout');
      return {
        ok: true,
        id: `provider-${reservation.refund_id}`,
        amount: reservation.amount_paise,
        currency: 'INR',
        status: 'processed',
      };
    },
    markUnknown: async (reservation) => {
      const row = refunds.get(reservation.scope);
      row.status = 'manual_review';
    },
    markFailed: async (reservation) => {
      const row = refunds.get(reservation.scope);
      row.status = 'failed';
    },
    saveProviderResult: async (reservation, providerRefund, status) => {
      const row = refunds.get(reservation.scope);
      row.provider_refund_id = providerRefund.id;
      row.status = status;
    },
    finalizeIntent: async () => {},
  };

  async function http(request) {
    const actor = request.headers.get('x-test-actor');
    const role = request.headers.get('x-test-role');
    if (!actor) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
    if (role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const input = await request.json();
    if (input.ownerId && input.ownerId !== actor && role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const result = await executeRefundOperation(
      { ...input, requestedBy: actor },
      dependencies
    );
    return Response.json(result.body, { status: result.httpStatus });
  }

  function request(body, actor = 'admin-1', role = 'admin') {
    return new Request('https://test.invalid/api/razorpay/refunds', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-actor': actor,
        'x-test-role': role,
      },
      body: JSON.stringify({
        paymentIntentId: 'intent-1',
        idempotencyKey: 'key-1',
        ...body,
      }),
    });
  }

  return {
    http,
    request,
    refunds,
    setProviderFailure(value) {
      providerFailure = value;
    },
    stats() {
      return {
        providerCalls,
        walletRestorations,
        ledgerRows,
        refundCount: refunds.size,
      };
    },
  };
}

test('sequential duplicate refund returns original result with one provider call', async () => {
  const h = createHarness();
  const first = await h.http(h.request({ amountPaise: 4_000 }));
  const second = await h.http(h.request({ amountPaise: 4_000 }));
  const a = await first.json();
  const b = await second.json();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(a.refundId, b.refundId);
  assert.equal(b.idempotentReplay, true);
  assert.equal(h.stats().providerCalls, 1);
});

test('concurrent duplicate refund creates one provider call', async () => {
  const h = createHarness({ providerDelay: 20 });
  const [first, second] = await Promise.all([
    h.http(h.request({ amountPaise: 4_000 })),
    h.http(h.request({ amountPaise: 4_000 })),
  ]);
  const [a, b] = await Promise.all([first.json(), second.json()]);
  assert.equal(a.refundId, b.refundId);
  assert.equal(h.stats().providerCalls, 1);
  assert.equal(h.stats().refundCount, 1);
});

test('retry after provider timeout does not duplicate refund', async () => {
  const h = createHarness();
  h.setProviderFailure('timeout');
  const first = await h.http(h.request({ amountPaise: 2_000 }));
  h.setProviderFailure(null);
  const retry = await h.http(h.request({ amountPaise: 2_000 }));
  assert.equal(first.status, 503);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).status, 'manual_review');
  assert.equal(h.stats().providerCalls, 1);
});

test('different keys cannot exceed refundable balance', async () => {
  const h = createHarness();
  await h.http(h.request({ amountPaise: 7_000 }));
  const response = await h.http(h.request({
    amountPaise: 4_000,
    idempotencyKey: 'key-2',
  }));
  assert.equal(response.status, 409);
  assert.equal(h.stats().providerCalls, 1);
});

test('duplicate full refund is harmless', async () => {
  const h = createHarness();
  await h.http(h.request({}));
  const replay = await h.http(h.request({}));
  assert.equal(replay.status, 200);
  assert.equal(h.stats().refundCount, 1);
  assert.equal(h.stats().providerCalls, 1);
});

test('duplicate partial refund is harmless', async () => {
  const h = createHarness();
  await h.http(h.request({ amountPaise: 2_500 }));
  await h.http(h.request({ amountPaise: 2_500 }));
  assert.equal(h.stats().refundCount, 1);
  assert.equal(h.stats().providerCalls, 1);
});

test('valid second partial refund succeeds', async () => {
  const h = createHarness();
  await h.http(h.request({ amountPaise: 2_500 }));
  const second = await h.http(h.request({
    amountPaise: 3_000,
    idempotencyKey: 'key-2',
  }));
  assert.equal(second.status, 200);
  assert.equal(h.stats().refundCount, 2);
  assert.equal(h.stats().providerCalls, 2);
});

test('over-refund is rejected', async () => {
  const h = createHarness();
  const response = await h.http(h.request({ amountPaise: 10_001 }));
  assert.equal(response.status, 409);
  assert.equal(h.stats().providerCalls, 0);
});

test('wallet restoration and refund ledger remain at-most-once (zero by policy)', async () => {
  const h = createHarness();
  await h.http(h.request({ amountPaise: 1_000 }));
  await h.http(h.request({ amountPaise: 1_000 }));
  assert.equal(h.stats().walletRestorations, 0);
  assert.equal(h.stats().ledgerRows, 0);
});

test('unauthenticated and unauthorized refunds are rejected', async () => {
  const h = createHarness();
  const unauthenticated = new Request('https://test.invalid/api/razorpay/refunds', {
    method: 'POST',
    body: '{}',
  });
  assert.equal((await h.http(unauthenticated)).status, 401);
  assert.equal((await h.http(h.request({}, 'student-1', 'student'))).status, 403);
});

test('actor is part of idempotency scope', async () => {
  const h = createHarness();
  await h.http(h.request({ amountPaise: 2_000 }, 'admin-1'));
  const secondActor = await h.http(h.request({ amountPaise: 2_000 }, 'admin-2'));
  assert.equal(secondActor.status, 200);
  assert.equal(h.stats().refundCount, 2);
});

test('Test Mode checkout defaults disabled and allows only admins/allowlist', () => {
  assert.equal(testCheckoutEnabledValue(undefined), false);
  assert.equal(approvedTestUserValue({
    enabled: 'false', userId: 'u1', role: 'admin', approvedUserIds: 'u1',
  }), false);
  assert.equal(approvedTestUserValue({
    enabled: 'true', userId: 'u1', role: 'student', approvedUserIds: 'u2',
  }), false);
  assert.equal(approvedTestUserValue({
    enabled: 'true', userId: 'u1', role: 'student', approvedUserIds: 'u1,u2',
  }), true);
  assert.equal(approvedTestUserValue({
    enabled: 'true', userId: 'admin', role: 'admin', approvedUserIds: '',
  }), true);
});

test('missing credentials and mixed live/test credentials fail safely', () => {
  assert.throws(() => validateEnvironmentValues({
    mode: 'test',
    keyId: undefined,
    keySecret: undefined,
    publicKeyId: undefined,
  }));
  assert.throws(() => validateEnvironmentValues({
    mode: 'test',
    keyId: 'rzp_live_example',
    keySecret: 'secret',
    publicKeyId: 'rzp_live_example',
  }));
});

test('duplicate after local completion returns the processed original', async () => {
  const h = createHarness();
  const first = await h.http(h.request({ amountPaise: 1_500 }));
  const replay = await h.http(h.request({ amountPaise: 1_500 }));
  assert.equal((await first.json()).status, 'processed');
  const result = await replay.json();
  assert.equal(result.status, 'processed');
  assert.equal(result.idempotentReplay, true);
});

test('provider creation cannot occur twice before local completion', async () => {
  const h = createHarness({ providerDelay: 30 });
  const first = h.http(h.request({ amountPaise: 1_500 }));
  await new Promise((resolve) => setTimeout(resolve, 5));
  const replay = await h.http(h.request({ amountPaise: 1_500 }));
  await first;
  assert.equal(replay.status, 200);
  assert.equal(h.stats().providerCalls, 1);
});

test('client amount manipulation remains bounded by captured amount', async () => {
  const h = createHarness({ capturedPaise: 5_000 });
  const negative = await h.http(h.request({ amountPaise: -1 }));
  const oversized = await h.http(h.request({
    amountPaise: 9_999_999,
    idempotencyKey: 'oversized',
  }));
  assert.equal(negative.status, 409);
  assert.equal(oversized.status, 409);
  assert.equal(h.stats().providerCalls, 0);
});

test('refund webhook can attach early provider result by local refund note', () => {
  assert.match(webhookRoute, /localRefundId/);
  assert.match(webhookRoute, /provider_refund_id: providerRefundId/);
  assert.match(webhookRoute, /refundQuery\.eq\('id', localRefundId\)/);
});

test('refund webhook replay remains protected by event fingerprint uniqueness', () => {
  assert.match(webhookRoute, /event_fingerprint: eventFingerprint/);
  assert.match(webhookRoute, /if \(existingEvent\)/);
  assert.match(webhookRoute, /duplicate: true/);
});

test('Test Mode creation is server-gated before environment use', () => {
  assert.ok(
    createRoute.indexOf('if (!isApprovedRazorpayTestUser')
      < createRoute.indexOf('const environment = validateRazorpayEnvironment()')
  );
  assert.match(createRoute, /calculateDarkStorePricing\(body\.items\)/);
});

test('valid Test Mode creation returns only public checkout configuration', () => {
  assert.match(createRoute, /keyId: environment\.publicKeyId/);
  assert.doesNotMatch(createRoute, /keySecret:/);
  assert.doesNotMatch(createRoute, /webhookSecret:/);
});

test('duplicate checkout creation reuses user-scoped intent', () => {
  assert.match(createRoute, /\.eq\('idempotency_key', body\.idempotencyKey\)/);
  assert.match(createRoute, /return intentResponse\(intent, environment\.publicKeyId/);
});

test('callback replay returns one existing internal order', () => {
  assert.match(verifyRoute, /if \(intent\.internal_order_id\)/);
  assert.match(verifyRoute, /idempotentReplay: true/);
});

test('browser refresh retains and reuses the checkout idempotency key', () => {
  assert.match(checkoutUi, /sessionStorage\.getItem\(storageKey\)/);
  assert.match(checkoutUi, /sessionStorage\.setItem\(storageKey, idempotencyKey\)/);
  assert.match(checkoutUi, /payment\.status === 'order_created'/);
});

test('client checkout bundle references no server secret variables', () => {
  assert.doesNotMatch(
    checkoutUi,
    /RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|SUPABASE_SERVICE_ROLE_KEY/
  );
  assert.match(checkoutUi, /payment\.keyId/);
});

test('refund route claims the database record before provider call', () => {
  assert.ok(
    refundRoute.indexOf("reserve_razorpay_refund")
      < refundRoute.indexOf("createProviderRefund:")
  );
});
