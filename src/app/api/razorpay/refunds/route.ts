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
import { executeRefundOperation } from '@/lib/payments/refund-operation.mjs';

interface RefundRequestBody {
  paymentIntentId: string;
  idempotencyKey: string;
  amountPaise?: number;
}

export async function POST(request: Request) {
  try {
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
    const environment = validateRazorpayEnvironment();

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

    const operation = await executeRefundOperation(
      {
        paymentIntentId: intent.id,
        requestedBy: user.id,
        idempotencyKey: body.idempotencyKey,
        amountPaise: requestedPaise,
      },
      {
        reserve: async () => {
          const { data, error } = await adminSupabase.rpc(
            'reserve_razorpay_refund',
            {
              p_payment_intent_id: intent.id,
              p_requested_by: user.id,
              p_idempotency_key: body.idempotencyKey,
              p_amount_paise: requestedPaise,
            }
          );
          if (error || !data) throw new Error('Refund reservation rejected');
          return data;
        },
        createProviderRefund: async (reservation) => {
          const response = await razorpayFetch(
            `/payments/${encodeURIComponent(intent.provider_payment_id)}/refund`,
            environment,
            {
              method: 'POST',
              body: JSON.stringify({
                amount: Number(reservation.amount_paise),
                speed: 'normal',
                receipt: `rf_${reservation.refund_id.replaceAll('-', '').slice(0, 24)}`,
                notes: {
                  payment_intent_id: intent.id,
                  refund_id: reservation.refund_id,
                },
              }),
            }
          );
          return { ok: response.ok, ...(await response.json()) };
        },
        markUnknown: async (reservation) => {
          await adminSupabase
            .from('payment_refunds')
            .update({
              status: 'manual_review',
              failure_code: 'PROVIDER_TIMEOUT',
              failure_reason: 'Refund result is unknown',
            })
            .eq('id', reservation.refund_id);
          await adminSupabase
            .from('payment_intents')
            .update({ status: 'manual_review' })
            .eq('id', intent.id)
            .eq('status', 'refund_pending');
        },
        markFailed: async (reservation) => {
          await adminSupabase
            .from('payment_refunds')
            .update({
              status: 'failed',
              failure_code: 'PROVIDER_REFUND_FAILED',
              failure_reason: 'Provider rejected refund',
            })
            .eq('id', reservation.refund_id);
          await adminSupabase
            .from('payment_intents')
            .update({ status: 'refund_failed' })
            .eq('id', intent.id)
            .eq('status', 'refund_pending');
        },
        saveProviderResult: async (reservation, providerRefund, status) => {
          await adminSupabase
            .from('payment_refunds')
            .update({
              provider_refund_id: providerRefund.id,
              status,
              completed_at: status === 'processed'
                ? new Date().toISOString()
                : null,
            })
            .eq('id', reservation.refund_id);
        },
        finalizeIntent: async () => {
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
        },
      }
    );

    return NextResponse.json(operation.body, { status: operation.httpStatus });
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
