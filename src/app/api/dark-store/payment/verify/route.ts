import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { calculateDarkStorePricing, type DarkStoreCartInputItem } from '@/lib/dark-store/pricing';

interface VerifyDarkStorePaymentBody {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  items: DarkStoreCartInputItem[];
  promoCode?: string | null;
}

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
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

    const body = (await req.json()) as VerifyDarkStorePaymentBody;

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      items,
      promoCode = null,
    } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

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
    const expectedAmountInPaise = Math.round(finalAmount * 100);

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    const razorpayOrder = await orderResponse.json();

    if (!orderResponse.ok) {
      return NextResponse.json({ error: 'Unable to validate payment order' }, { status: 400 });
    }

    if (Number(razorpayOrder.amount) !== expectedAmountInPaise || razorpayOrder.currency !== 'INR') {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    const paymentInfo = await paymentResponse.json();

    if (!paymentResponse.ok || paymentInfo.status !== 'captured') {
      return NextResponse.json({ error: 'Payment not captured' }, { status: 400 });
    }

    const orderNumber = `DS${Date.now().toString().slice(-8)}`;
    const checkoutItems = pricing.normalizedItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const { data: createdOrder, error: orderInsertError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        order_type: 'store',
        status: 'pending',
        total_amount: pricing.totalBeforeDiscount,
        delivery_fee: pricing.deliveryFee,
        discount_amount: discountAmount,
        promo_code: appliedPromoCode,
        promo_discount: discountAmount,
        final_amount: finalAmount,
        payment_method: 'razorpay',
        payment_id: razorpayPaymentId,
        items: checkoutItems,
        notes: null,
      })
      .select('id, order_number')
      .single();

    if (orderInsertError || !createdOrder) {
      return NextResponse.json({ error: 'Failed to persist order' }, { status: 500 });
    }

    const orderItemsPayload = pricing.normalizedItems.map((item) => ({
      order_id: createdOrder.id,
      item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
      total_price: item.totalPrice,
    }));

    const { error: orderItemsError } = await supabase.from('order_items').insert(orderItemsPayload);

    if (orderItemsError) {
      return NextResponse.json({ error: 'Failed to persist order items' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      finalAmount,
      items: checkoutItems,
      promoCode: appliedPromoCode,
      promoDiscount: discountAmount || undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
