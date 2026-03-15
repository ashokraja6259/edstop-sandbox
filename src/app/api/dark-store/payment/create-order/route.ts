import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { createClient } from '@/lib/supabase/server';
import { calculateDarkStorePricing, type DarkStoreCartInputItem } from '@/lib/dark-store/pricing';

interface CreateDarkStorePaymentBody {
  items: DarkStoreCartInputItem[];
  promoCode?: string | null;
}

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? keyId;

    if (!keyId || !keySecret || !publicKey) {
      return NextResponse.json({ error: 'Payment provider is not configured' }, { status: 500 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const body = (await req.json()) as CreateDarkStorePaymentBody;

    const { items, promoCode = null } = body;

    const pricing = calculateDarkStorePricing(items);

    let discountAmount = 0;
    let appliedPromoCode: string | null = null;

    if (promoCode) {
      const { data: promoResult, error: promoError } = await supabase.rpc('validate_promo_code', {
        p_code: promoCode,
        p_order_amount: pricing.totalBeforeDiscount,
        p_order_type: 'store',
      });

      if (promoError) {
        return NextResponse.json({ error: 'Unable to validate promo code' }, { status: 400 });
      }

      if (!promoResult?.valid) {
        return NextResponse.json({ error: promoResult?.error ?? 'Invalid promo code' }, { status: 400 });
      }

      discountAmount = Number(promoResult.discount) || 0;
      appliedPromoCode = promoCode.toUpperCase();
    }

    const finalAmount = Math.max(0, pricing.totalBeforeDiscount - discountAmount);
    const amountInPaise = Math.round(finalAmount * 100);

    if (amountInPaise <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `ds_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          user_id: user.id,
          order_type: 'store',
        },
      }),
    });

    const razorpayOrder = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      return NextResponse.json(
        { error: razorpayOrder?.error?.description || 'Failed to create payment order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keyId: publicKey,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      breakdown: {
        subtotal: pricing.subtotal,
        deliveryFee: pricing.deliveryFee,
        discountAmount,
        finalAmount,
      },
      normalizedItems: pricing.normalizedItems,
      promoCode: appliedPromoCode,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
