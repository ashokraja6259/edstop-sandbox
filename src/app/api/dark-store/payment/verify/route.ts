import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  isValidIdentifier,
  razorpayFetch,
  readJsonBody,
  validateRazorpayEnvironment,
  verifyHmacHex,
} from '@/lib/payments/razorpay';
import { isApprovedRazorpayTestUser } from '@/lib/payments/test-checkout';

interface VerifyDarkStorePaymentBody {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface PaymentIntentRow {
  id: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  razorpay_amount_paise: number;
  currency: string;
  status: string;
  internal_order_id: string | null;
}

interface FinalizeResult {
  order_id: string;
  order_number?: string;
  idempotent_replay: boolean;
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
    if (!isApprovedRazorpayTestUser(user.id, profile?.role)) {
      return NextResponse.json(
        { error: 'Razorpay Test Mode checkout is disabled' },
        { status: 403 }
      );
    }
    const environment = validateRazorpayEnvironment();

    const body = await readJsonBody<VerifyDarkStorePaymentBody>(request);
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    if (
      !isValidIdentifier(razorpayOrderId)
      || !isValidIdentifier(razorpayPaymentId)
      || typeof razorpaySignature !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid payment verification fields' },
        { status: 400 }
      );
    }

    if (
      !verifyHmacHex(
        `${razorpayOrderId}|${razorpayPaymentId}`,
        razorpaySignature,
        environment.keySecret
      )
    ) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: intentData, error: intentError } = await adminSupabase
      .from('payment_intents')
      .select(
        'id, provider_order_id, provider_payment_id, razorpay_amount_paise, currency, status, internal_order_id'
      )
      .eq('provider_order_id', razorpayOrderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (intentError) {
      return NextResponse.json({ error: 'Unable to validate payment' }, { status: 500 });
    }

    const intent = intentData as PaymentIntentRow | null;
    if (!intent || intent.provider_order_id !== razorpayOrderId) {
      return NextResponse.json({ error: 'Payment intent not found' }, { status: 404 });
    }

    if (intent.internal_order_id) {
      if (
        intent.provider_payment_id
        && intent.provider_payment_id !== razorpayPaymentId
      ) {
        return NextResponse.json(
          { error: 'Payment identifier mismatch' },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: intent.internal_order_id,
        idempotentReplay: true,
      });
    }

    const [orderResponse, paymentResponse] = await Promise.all([
      razorpayFetch(`/orders/${encodeURIComponent(razorpayOrderId)}`, environment),
      razorpayFetch(`/payments/${encodeURIComponent(razorpayPaymentId)}`, environment),
    ]);
    const [providerOrder, providerPayment] = await Promise.all([
      orderResponse.json(),
      paymentResponse.json(),
    ]);

    if (!orderResponse.ok || !paymentResponse.ok) {
      return NextResponse.json({ error: 'Unable to validate provider payment' }, { status: 502 });
    }
    if (
      providerPayment.status !== 'captured'
      || providerPayment.captured !== true
    ) {
      return NextResponse.json({ error: 'Payment is not captured' }, { status: 409 });
    }
    if (
      providerPayment.order_id !== razorpayOrderId
      || providerOrder.id !== razorpayOrderId
    ) {
      return NextResponse.json({ error: 'Payment order mismatch' }, { status: 400 });
    }
    if (
      Number(providerOrder.amount) !== intent.razorpay_amount_paise
      || providerOrder.currency !== intent.currency
      || Number(providerPayment.amount) !== intent.razorpay_amount_paise
      || providerPayment.currency !== intent.currency
    ) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    const { data: finalizedData, error: finalizeError } = await adminSupabase.rpc(
      'finalize_razorpay_payment',
      {
        p_payment_intent_id: intent.id,
        p_provider_payment_id: razorpayPaymentId,
        p_amount_paise: intent.razorpay_amount_paise,
        p_currency: intent.currency,
        p_provider_snapshot: {
          payment_status: providerPayment.status,
          order_status: providerOrder.status,
          captured: providerPayment.captured,
        },
      }
    );

    if (finalizeError) {
      await adminSupabase
        .from('payment_intents')
        .update({
          status: 'manual_review',
          failure_code: 'ATOMIC_FINALIZATION_FAILED',
          failure_reason: 'Captured payment requires reconciliation',
          last_provider_sync_at: new Date().toISOString(),
        })
        .eq('id', intent.id)
        .in('status', [
          'razorpay_order_created',
          'authorized',
          'captured',
          'verified',
        ]);
      return NextResponse.json(
        { error: 'Payment captured; order completion is being reconciled' },
        { status: 202 }
      );
    }

    const finalized = finalizedData as FinalizeResult | null;
    if (!finalized?.order_id) {
      return NextResponse.json({ error: 'Unable to complete payment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: finalized.order_id,
      orderNumber: finalized.order_number,
      idempotentReplay: finalized.idempotent_replay,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    const status = [
      'Invalid request body',
      'Request body is too large',
    ].includes(message)
      ? 400
      : 500;
    return NextResponse.json(
      { error: status === 400 ? message : 'Unable to verify payment' },
      { status }
    );
  }
}
