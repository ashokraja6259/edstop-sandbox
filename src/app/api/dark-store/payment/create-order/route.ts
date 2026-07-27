import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateDarkStorePricing,
  type DarkStoreCartInputItem,
} from '@/lib/dark-store/pricing';
import {
  isValidIdempotencyKey,
  razorpayFetch,
  readJsonBody,
  rupeesToPaise,
  validateRazorpayEnvironment,
} from '@/lib/payments/razorpay';
import { isApprovedRazorpayTestUser } from '@/lib/payments/test-checkout';

interface CreateDarkStorePaymentBody {
  items: DarkStoreCartInputItem[];
  promoCode?: string | null;
  walletAmountPaise?: number;
  idempotencyKey: string;
}

interface ExistingIntent {
  id: string;
  provider_order_id: string | null;
  status: string;
  razorpay_amount_paise: number;
  currency: string;
  internal_order_id: string | null;
}

function intentResponse(
  intent: ExistingIntent,
  publicKeyId: string,
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      intentId: intent.id,
      keyId: publicKeyId,
      razorpayOrderId: intent.provider_order_id,
      amount: intent.razorpay_amount_paise,
      currency: intent.currency,
      status: intent.status,
      orderId: intent.internal_order_id,
      idempotentReplay: true,
    },
    { status }
  );
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

    const body = await readJsonBody<CreateDarkStorePaymentBody>(request);
    if (!isValidIdempotencyKey(body.idempotencyKey)) {
      return NextResponse.json({ error: 'Invalid idempotency key' }, { status: 400 });
    }

    const pricing = calculateDarkStorePricing(body.items);
    const adminSupabase = createAdminClient();

    const { count: recentAttempts, error: attemptsError } = await adminSupabase
      .from('payment_intents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString());

    if (attemptsError) {
      return NextResponse.json({ error: 'Unable to initialize payment' }, { status: 500 });
    }
    if ((recentAttempts ?? 0) >= 5) {
      return NextResponse.json({ error: 'Too many payment attempts' }, { status: 429 });
    }

    let discountAmount = 0;
    let appliedPromoCode: string | null = null;
    if (body.promoCode) {
      const { data: promoResult, error: promoError } = await supabase.rpc(
        'validate_promo_code',
        {
          p_code: body.promoCode,
          p_order_amount: pricing.totalBeforeDiscount,
          p_order_type: 'store',
        }
      );

      if (promoError || !promoResult?.valid) {
        return NextResponse.json(
          { error: promoResult?.error ?? 'Invalid promo code' },
          { status: 400 }
        );
      }
      discountAmount = Number(promoResult.discount) || 0;
      appliedPromoCode = body.promoCode.toUpperCase();
    }

    const itemSubtotalPaise = rupeesToPaise(pricing.subtotal);
    const feeAmountPaise = rupeesToPaise(pricing.deliveryFee);
    const discountAmountPaise = rupeesToPaise(discountAmount);
    const totalAmountPaise =
      itemSubtotalPaise + feeAmountPaise - discountAmountPaise;
    const walletAmountPaise = Number(body.walletAmountPaise ?? 0);

    if (
      !Number.isSafeInteger(walletAmountPaise)
      || walletAmountPaise < 0
      || walletAmountPaise > totalAmountPaise
    ) {
      return NextResponse.json({ error: 'Invalid wallet amount' }, { status: 400 });
    }

    if (walletAmountPaise > 0) {
      const { data: wallet, error: walletError } = await adminSupabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (
        walletError
        || !wallet
        || rupeesToPaise(Number(wallet.balance)) < walletAmountPaise
      ) {
        return NextResponse.json(
          { error: 'Insufficient wallet balance' },
          { status: 400 }
        );
      }
    }

    const razorpayAmountPaise = totalAmountPaise - walletAmountPaise;
    if (razorpayAmountPaise <= 0) {
      return NextResponse.json(
        { error: 'Use the existing wallet checkout for wallet-only orders' },
        { status: 400 }
      );
    }

    const normalizedItems = pricing.normalizedItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      pricePaise: rupeesToPaise(item.price),
      totalPricePaise: rupeesToPaise(item.totalPrice),
    }));

    const intentId = crypto.randomUUID();
    const receipt = `ds_${intentId.replaceAll('-', '').slice(0, 24)}`;
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    const { data: insertedIntent, error: insertError } = await adminSupabase
      .from('payment_intents')
      .insert({
        id: intentId,
        user_id: user.id,
        provider: 'razorpay',
        provider_order_id: null,
        order_type: 'store',
        idempotency_key: body.idempotencyKey,
        receipt,
        amount_paise: razorpayAmountPaise,
        item_subtotal_paise: itemSubtotalPaise,
        tax_amount_paise: 0,
        fee_amount_paise: feeAmountPaise,
        discount_amount_paise: discountAmountPaise,
        wallet_amount_paise: walletAmountPaise,
        razorpay_amount_paise: razorpayAmountPaise,
        total_amount_paise: totalAmountPaise,
        currency: 'INR',
        items: normalizedItems,
        promo_code: appliedPromoCode,
        status: 'created',
        environment_mode: environment.mode,
        expires_at: expiresAt,
      })
      .select(
        'id, provider_order_id, status, razorpay_amount_paise, currency, internal_order_id'
      )
      .maybeSingle();

    let intent = insertedIntent as ExistingIntent | null;
    if (insertError) {
      const { data: existing, error: existingError } = await adminSupabase
        .from('payment_intents')
        .select(
          'id, provider_order_id, status, razorpay_amount_paise, currency, internal_order_id'
        )
        .eq('user_id', user.id)
        .eq('idempotency_key', body.idempotencyKey)
        .maybeSingle();

      if (existingError || !existing) {
        return NextResponse.json({ error: 'Unable to initialize payment' }, { status: 500 });
      }
      intent = existing as ExistingIntent;
    }

    if (!intent) {
      return NextResponse.json({ error: 'Unable to initialize payment' }, { status: 500 });
    }
    if (intent.provider_order_id || intent.internal_order_id) {
      return intentResponse(intent, environment.publicKeyId);
    }
    if (intent.status !== 'created') {
      return intentResponse(intent, environment.publicKeyId, 202);
    }

    const { data: claimedIntent } = await adminSupabase
      .from('payment_intents')
      .update({ status: 'pending' })
      .eq('id', intent.id)
      .eq('status', 'created')
      .select('id')
      .maybeSingle();
    if (!claimedIntent) {
      return intentResponse({ ...intent, status: 'pending' }, environment.publicKeyId, 202);
    }

    let providerResponse: Response;
    try {
      providerResponse = await razorpayFetch('/orders', environment, {
        method: 'POST',
        body: JSON.stringify({
          amount: intent.razorpay_amount_paise,
          currency: 'INR',
          receipt,
          notes: {
            payment_intent_id: intent.id,
            order_type: 'store',
          },
        }),
      });
    } catch {
      await adminSupabase
        .from('payment_intents')
        .update({
          status: 'manual_review',
          failure_code: 'PROVIDER_TIMEOUT',
          failure_reason: 'Provider order result is unknown',
        })
        .eq('id', intent.id)
        .eq('status', 'pending');
      return NextResponse.json(
        { error: 'Payment provider did not respond; retry with the same key' },
        { status: 503 }
      );
    }

    const providerOrder = await providerResponse.json();
    if (
      !providerResponse.ok
      || typeof providerOrder?.id !== 'string'
      || Number(providerOrder.amount) !== intent.razorpay_amount_paise
      || providerOrder.currency !== 'INR'
    ) {
      await adminSupabase
        .from('payment_intents')
        .update({
          status: 'failed',
          failure_code: 'PROVIDER_ORDER_FAILED',
          failure_reason: 'Provider rejected order creation',
        })
        .eq('id', intent.id)
        .eq('status', 'pending');
      return NextResponse.json({ error: 'Unable to create payment order' }, { status: 502 });
    }

    const { data: linkedIntent, error: linkError } = await adminSupabase
      .from('payment_intents')
      .update({
        provider_order_id: providerOrder.id,
        status: 'razorpay_order_created',
        last_provider_sync_at: new Date().toISOString(),
      })
      .eq('id', intent.id)
      .eq('status', 'pending')
      .select(
        'id, provider_order_id, status, razorpay_amount_paise, currency, internal_order_id'
      )
      .single();

    if (linkError || !linkedIntent) {
      return NextResponse.json(
        { error: 'Payment order requires reconciliation' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      intentId: linkedIntent.id,
      keyId: environment.publicKeyId,
      razorpayOrderId: linkedIntent.provider_order_id,
      amount: linkedIntent.razorpay_amount_paise,
      currency: linkedIntent.currency,
      expiresAt,
      breakdown: {
        subtotalPaise: itemSubtotalPaise,
        feePaise: feeAmountPaise,
        discountPaise: discountAmountPaise,
        walletPaise: walletAmountPaise,
        razorpayPaise: razorpayAmountPaise,
        totalPaise: totalAmountPaise,
      },
    });
  } catch (error: unknown) {
    const status =
      error instanceof Error
      && ['Invalid request body', 'Request body is too large'].includes(error.message)
        ? 400
        : 500;
    return NextResponse.json(
      { error: status === 400 ? (error as Error).message : 'Unable to initialize payment' },
      { status }
    );
  }
}
