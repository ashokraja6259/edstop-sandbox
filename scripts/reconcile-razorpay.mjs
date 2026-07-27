#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';

const applyChanges = process.argv.includes('--apply');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const mode = process.env.RAZORPAY_MODE;

if (
  !supabaseUrl
  || !serviceRoleKey
  || !keyId
  || !keySecret
  || !['test', 'live'].includes(mode)
) {
  throw new Error('Reconciliation environment is incomplete');
}

const expectedPrefix = mode === 'test' ? 'rzp_test_' : 'rzp_live_';
if (!keyId.startsWith(expectedPrefix)) {
  throw new Error('Razorpay credential mode mismatch');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

async function providerFetch(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    return await fetch(`https://api.razorpay.com/v1${path}`, {
      headers: { Authorization: `Basic ${authHeader}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const { data: intents, error } = await supabase
  .from('payment_intents')
  .select(
    'id, provider_order_id, razorpay_amount_paise, currency, status, expires_at, internal_order_id'
  )
  .in('status', [
    'created',
    'pending',
    'razorpay_order_created',
    'authorized',
    'captured',
    'manual_review',
    'refund_pending',
    'refund_failed',
  ])
  .order('created_at', { ascending: true })
  .limit(100);

if (error) throw new Error('Unable to load payment intents for reconciliation');

const summary = {
  mode: applyChanges ? 'apply' : 'dry-run',
  inspected: 0,
  wouldFinalize: 0,
  finalized: 0,
  wouldExpire: 0,
  expired: 0,
  manualReview: 0,
  unchanged: 0,
};

for (const intent of intents ?? []) {
  summary.inspected += 1;

  if (intent.internal_order_id) {
    summary.unchanged += 1;
    continue;
  }

  if (!intent.provider_order_id) {
    if (new Date(intent.expires_at).getTime() <= Date.now()) {
      summary.wouldExpire += 1;
      if (applyChanges && ['created', 'pending'].includes(intent.status)) {
        const { error: expireError } = await supabase
          .from('payment_intents')
          .update({
            status: 'expired',
            failure_code: 'STALE_INTENT',
            failure_reason: 'Intent expired before provider order linkage',
          })
          .eq('id', intent.id)
          .in('status', ['created', 'pending']);
        if (!expireError) summary.expired += 1;
      }
    } else {
      summary.unchanged += 1;
    }
    continue;
  }

  try {
    const response = await providerFetch(
      `/orders/${encodeURIComponent(intent.provider_order_id)}/payments`
    );
    if (!response.ok) throw new Error('Provider lookup failed');
    const payload = await response.json();
    const captured = Array.isArray(payload.items)
      ? payload.items.find(
          (payment) =>
            payment.status === 'captured'
            && payment.captured === true
            && Number(payment.amount) === Number(intent.razorpay_amount_paise)
            && payment.currency === intent.currency
        )
      : null;

    if (captured) {
      summary.wouldFinalize += 1;
      if (applyChanges) {
        const { error: finalizeError } = await supabase.rpc(
          'finalize_razorpay_payment',
          {
            p_payment_intent_id: intent.id,
            p_provider_payment_id: captured.id,
            p_amount_paise: intent.razorpay_amount_paise,
            p_currency: intent.currency,
            p_provider_snapshot: {
              source: 'reconciliation',
              payment_status: captured.status,
            },
          }
        );
        if (finalizeError) {
          await supabase
            .from('payment_intents')
            .update({ status: 'manual_review' })
            .eq('id', intent.id)
            .neq('status', 'order_created');
          summary.manualReview += 1;
        } else {
          summary.finalized += 1;
        }
      }
    } else if (
      new Date(intent.expires_at).getTime() <= Date.now()
      && ['razorpay_order_created', 'authorized'].includes(intent.status)
    ) {
      summary.wouldExpire += 1;
      if (applyChanges) {
        const { error: expireError } = await supabase
          .from('payment_intents')
          .update({
            status: 'expired',
            failure_code: 'STALE_PROVIDER_ORDER',
            failure_reason: 'No captured payment before expiry',
            last_provider_sync_at: new Date().toISOString(),
          })
          .eq('id', intent.id)
          .in('status', ['razorpay_order_created', 'authorized']);
        if (!expireError) summary.expired += 1;
      }
    } else {
      summary.unchanged += 1;
    }
  } catch {
    summary.manualReview += 1;
    if (applyChanges && intent.status !== 'manual_review') {
      await supabase
        .from('payment_intents')
        .update({
          status: 'manual_review',
          failure_code: 'RECONCILIATION_LOOKUP_FAILED',
          failure_reason: 'Provider state could not be reconciled',
        })
        .eq('id', intent.id)
        .neq('status', 'order_created');
    }
  }
}

process.stdout.write(`${JSON.stringify(summary)}\n`);
