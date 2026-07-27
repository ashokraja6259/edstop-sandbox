import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fingerprintWebhook,
  isValidIdentifier,
  razorpayFetch,
  validateRazorpayEnvironment,
  verifyHmacHex,
} from '@/lib/payments/razorpay';

interface RazorpayWebhookPayload {
  event?: string;
  id?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
    refund?: { entity?: Record<string, unknown> };
  };
}

function textField(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function numberField(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > 256 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let environment;
  try {
    environment = validateRazorpayEnvironment(true);
  } catch {
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > 256 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const signature = request.headers.get('x-razorpay-signature') || '';
  if (
    !environment.webhookSecret
    || !verifyHmacHex(rawBody, signature, environment.webhookSecret)
  ) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let body: RazorpayWebhookPayload;
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const eventType = typeof body.event === 'string' ? body.event : '';
  if (!eventType || eventType.length > 128) {
    return NextResponse.json({ error: 'Invalid webhook event' }, { status: 400 });
  }

  const payment = body.payload?.payment?.entity;
  const order = body.payload?.order?.entity;
  const refund = body.payload?.refund?.entity;
  const providerPaymentId = textField(payment, 'id');
  const providerOrderId =
    textField(payment, 'order_id') || textField(order, 'id');
  const providerRefundId = textField(refund, 'id');
  const eventFingerprint = fingerprintWebhook(rawBody);
  const eventId =
    isValidIdentifier(body.id, 128) ? body.id : null;
  const adminSupabase = createAdminClient();

  const { data: insertedEvent, error: eventInsertError } = await adminSupabase
    .from('razorpay_webhook_events')
    .insert({
      event_fingerprint: eventFingerprint,
      event_id: eventId,
      event_type: eventType,
      provider_order_id: providerOrderId,
      provider_payment_id: providerPaymentId,
      provider_refund_id: providerRefundId,
      payload_metadata: {
        payment_status: textField(payment, 'status'),
        order_status: textField(order, 'status'),
        refund_status: textField(refund, 'status'),
        amount: numberField(payment, 'amount') ?? numberField(refund, 'amount'),
        currency: textField(payment, 'currency') || textField(refund, 'currency'),
      },
    })
    .select('id')
    .maybeSingle();

  if (eventInsertError) {
    const { data: existingEvent } = await adminSupabase
      .from('razorpay_webhook_events')
      .select('id, processing_status')
      .eq('event_fingerprint', eventFingerprint)
      .maybeSingle();
    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: 'Unable to record webhook' }, { status: 500 });
  }

  if (!insertedEvent) {
    return NextResponse.json({ error: 'Unable to record webhook' }, { status: 500 });
  }

  try {
    if (
      ['payment.captured', 'order.paid'].includes(eventType)
      && providerOrderId
      && providerPaymentId
    ) {
      const { data: intent } = await adminSupabase
        .from('payment_intents')
        .select('id, razorpay_amount_paise, currency, internal_order_id')
        .eq('provider_order_id', providerOrderId)
        .maybeSingle();

      if (!intent) {
        throw new Error('No local payment intent for captured payment');
      }

      if (!intent.internal_order_id) {
        const [orderResponse, paymentResponse] = await Promise.all([
          razorpayFetch(`/orders/${encodeURIComponent(providerOrderId)}`, environment),
          razorpayFetch(`/payments/${encodeURIComponent(providerPaymentId)}`, environment),
        ]);
        const [providerOrder, providerPayment] = await Promise.all([
          orderResponse.json(),
          paymentResponse.json(),
        ]);

        if (
          !orderResponse.ok
          || !paymentResponse.ok
          || providerPayment.status !== 'captured'
          || providerPayment.captured !== true
          || providerPayment.order_id !== providerOrderId
          || Number(providerPayment.amount) !== intent.razorpay_amount_paise
          || providerPayment.currency !== intent.currency
          || Number(providerOrder.amount) !== intent.razorpay_amount_paise
          || providerOrder.currency !== intent.currency
        ) {
          throw new Error('Captured webhook does not match provider state');
        }

        const { error: finalizeError } = await adminSupabase.rpc(
          'finalize_razorpay_payment',
          {
            p_payment_intent_id: intent.id,
            p_provider_payment_id: providerPaymentId,
            p_amount_paise: intent.razorpay_amount_paise,
            p_currency: intent.currency,
            p_provider_snapshot: {
              source: 'webhook',
              event_type: eventType,
              payment_status: providerPayment.status,
            },
          }
        );
        if (finalizeError) throw new Error('Atomic webhook finalization failed');
      }

      await adminSupabase
        .from('razorpay_webhook_events')
        .update({
          payment_intent_id: intent.id,
          processing_status: 'processed',
          outcome: 'captured payment converged',
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedEvent.id);
    } else if (eventType === 'payment.authorized' && providerOrderId) {
      const { data: intent } = await adminSupabase
        .from('payment_intents')
        .update({
          status: 'authorized',
          last_provider_sync_at: new Date().toISOString(),
        })
        .eq('provider_order_id', providerOrderId)
        .eq('status', 'razorpay_order_created')
        .select('id')
        .maybeSingle();

      await adminSupabase
        .from('razorpay_webhook_events')
        .update({
          payment_intent_id: intent?.id ?? null,
          processing_status: 'processed',
          outcome: intent ? 'authorization recorded' : 'stale authorization ignored',
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedEvent.id);
    } else if (eventType === 'payment.failed' && providerOrderId) {
      const { data: intent } = await adminSupabase
        .from('payment_intents')
        .update({
          status: 'failed',
          failure_code: textField(payment, 'error_code') || 'PAYMENT_FAILED',
          failure_reason: 'Provider reported payment failure',
          last_provider_sync_at: new Date().toISOString(),
        })
        .eq('provider_order_id', providerOrderId)
        .in('status', ['created', 'pending', 'razorpay_order_created', 'authorized'])
        .select('id')
        .maybeSingle();

      await adminSupabase
        .from('razorpay_webhook_events')
        .update({
          payment_intent_id: intent?.id ?? null,
          processing_status: 'processed',
          outcome: intent ? 'failure recorded' : 'stale failure ignored',
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedEvent.id);
    } else if (
      ['refund.created', 'refund.processed', 'refund.failed'].includes(eventType)
      && providerRefundId
    ) {
      const refundStatus =
        eventType === 'refund.processed'
          ? 'processed'
          : eventType === 'refund.failed'
            ? 'failed'
            : 'refund_pending';
      const { data: refundRow } = await adminSupabase
        .from('payment_refunds')
        .update({
          status: refundStatus,
          completed_at:
            refundStatus === 'processed' ? new Date().toISOString() : null,
          failure_reason:
            refundStatus === 'failed' ? 'Provider reported refund failure' : null,
        })
        .eq('provider_refund_id', providerRefundId)
        .select('id, payment_intent_id')
        .maybeSingle();

      if (!refundRow) {
        throw new Error('Unknown refund requires manual reconciliation');
      }

      if (refundStatus === 'processed') {
        const { data: intent } = await adminSupabase
          .from('payment_intents')
          .select('razorpay_amount_paise')
          .eq('id', refundRow.payment_intent_id)
          .single();
        const { data: processedRefunds } = await adminSupabase
          .from('payment_refunds')
          .select('amount_paise')
          .eq('payment_intent_id', refundRow.payment_intent_id)
          .eq('status', 'processed');
        const refunded = (processedRefunds ?? []).reduce(
          (sum, row) => sum + Number(row.amount_paise),
          0
        );
        await adminSupabase
          .from('payment_intents')
          .update({
            status:
              refunded >= Number(intent?.razorpay_amount_paise)
                ? 'refunded'
                : 'partially_refunded',
          })
          .eq('id', refundRow.payment_intent_id)
          .in('status', ['refund_pending', 'partially_refunded']);
      }

      await adminSupabase
        .from('razorpay_webhook_events')
        .update({
          payment_intent_id: refundRow.payment_intent_id,
          processing_status: 'processed',
          outcome: `refund ${refundStatus}`,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedEvent.id);
    } else {
      await adminSupabase
        .from('razorpay_webhook_events')
        .update({
          processing_status: 'ignored',
          outcome: 'event type not actionable',
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedEvent.id);
    }

    return NextResponse.json({ received: true });
  } catch {
    await adminSupabase
      .from('razorpay_webhook_events')
      .update({
        processing_status: 'failed',
        outcome: 'manual reconciliation required',
        processed_at: new Date().toISOString(),
      })
      .eq('id', insertedEvent.id);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
