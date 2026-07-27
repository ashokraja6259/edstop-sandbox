import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  isValidIdentifier,
  isValidIdempotencyKey,
  razorpayFetch,
  readJsonBody,
  validateRazorpayEnvironment,
} from '@/lib/payments/razorpay';

interface RefundRequestBody {
  paymentIntentId: string;
  idempotencyKey: string;
  amountPaise?: number;
}

export async function POST(request: Request) {
  try {
    const environment = validateRazorpayEnvironment();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const body = await readJsonBody<RefundRequestBody>(request);
    if (
      !isValidIdentifier(body.paymentIntentId, 64)
      || !isValidIdempotencyKey(body.idempotencyKey)
    ) {
      return NextResponse.json({ error: 'Invalid refund request' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: intent, error: intentError } = await adminSupabase
      .from('payment_intents')
      .select(
        'id, provider_payment_id, razorpay_amount_paise, currency, status, internal_order_id'
      )
      .eq('id', body.paymentIntentId)
      .maybeSingle();

    if (
      intentError
      || !intent
      || !intent.provider_payment_id
      || !intent.internal_order_id
      || !['order_created', 'partially_refunded', 'refund_failed'].includes(intent.status)
    ) {
      return NextResponse.json({ error: 'Payment is not refundable' }, { status: 409 });
    }

    const requestedPaise =
      body.amountPaise === undefined ? null : Number(body.amountPaise);
    if (
      requestedPaise !== null
      && (!Number.isSafeInteger(requestedPaise) || requestedPaise <= 0)
    ) {
      return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 });
    }

    const { data: reservationData, error: reservationError } =
      await adminSupabase.rpc('reserve_razorpay_refund', {
        p_payment_intent_id: intent.id,
        p_requested_by: user.id,
        p_idempotency_key: body.idempotencyKey,
        p_amount_paise: requestedPaise,
      });

    if (reservationError || !reservationData) {
      return NextResponse.json(
        { error: 'Refund exceeds refundable amount' },
        { status: 409 }
      );
    }

    const reservation = reservationData as {
      refund_id: string;
      amount_paise: number;
      status: string;
      idempotent_replay: boolean;
    };
    if (reservation.idempotent_replay) {
      return NextResponse.json({
        success: true,
        refundId: reservation.refund_id,
        amountPaise: reservation.amount_paise,
        status: reservation.status,
        idempotentReplay: true,
      });
    }

    const refundId = reservation.refund_id;
    const refundAmountPaise = Number(reservation.amount_paise);

    let response: Response;
    try {
      response = await razorpayFetch(
        `/payments/${encodeURIComponent(intent.provider_payment_id)}/refund`,
        environment,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: refundAmountPaise,
            speed: 'normal',
            receipt: `rf_${refundId.replaceAll('-', '').slice(0, 24)}`,
            notes: {
              payment_intent_id: intent.id,
              refund_id: refundId,
            },
          }),
        }
      );
    } catch {
      await adminSupabase
        .from('payment_refunds')
        .update({
          status: 'manual_review',
          failure_code: 'PROVIDER_TIMEOUT',
          failure_reason: 'Refund result is unknown',
        })
        .eq('id', refundId);
      await adminSupabase
        .from('payment_intents')
        .update({ status: 'manual_review' })
        .eq('id', intent.id)
        .eq('status', 'refund_pending');
      return NextResponse.json(
        { error: 'Refund result requires reconciliation' },
        { status: 503 }
      );
    }

    const providerRefund = await response.json();
    if (
      !response.ok
      || !isValidIdentifier(providerRefund?.id)
      || Number(providerRefund.amount) !== refundAmountPaise
      || providerRefund.currency !== 'INR'
    ) {
      await adminSupabase
        .from('payment_refunds')
        .update({
          status: 'failed',
          failure_code: 'PROVIDER_REFUND_FAILED',
          failure_reason: 'Provider rejected refund',
        })
        .eq('id', refundId);
      await adminSupabase
        .from('payment_intents')
        .update({ status: 'refund_failed' })
        .eq('id', intent.id)
        .eq('status', 'refund_pending');
      return NextResponse.json({ error: 'Refund request failed' }, { status: 502 });
    }

    const providerStatus =
      providerRefund.status === 'processed' ? 'processed' : 'refund_pending';
    await adminSupabase
      .from('payment_refunds')
      .update({
        provider_refund_id: providerRefund.id,
        status: providerStatus,
        completed_at:
          providerStatus === 'processed' ? new Date().toISOString() : null,
      })
      .eq('id', refundId);

    if (providerStatus === 'processed') {
      const { data: processedRefunds } = await adminSupabase
        .from('payment_refunds')
        .select('amount_paise')
        .eq('payment_intent_id', intent.id)
        .eq('status', 'processed');
      const finalRefundedPaise = (processedRefunds ?? []).reduce(
        (sum, row) => sum + Number(row.amount_paise),
        0
      );
      await adminSupabase
        .from('payment_intents')
        .update({
          status:
            finalRefundedPaise >= Number(intent.razorpay_amount_paise)
              ? 'refunded'
              : 'partially_refunded',
        })
        .eq('id', intent.id)
        .eq('status', 'refund_pending');
    }

    return NextResponse.json({
      success: true,
      refundId,
      amountPaise: refundAmountPaise,
      status: providerStatus,
      idempotentReplay: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    const status = ['Invalid request body', 'Request body is too large'].includes(message)
      ? 400
      : 500;
    return NextResponse.json(
      { error: status === 400 ? message : 'Unable to process refund' },
      { status }
    );
  }
}
