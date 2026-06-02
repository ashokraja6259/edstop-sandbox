import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DarkStoreCalculatedItem } from '@/lib/dark-store/pricing';

interface VerifyDarkStorePaymentBody {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface PaymentIntentRow {
  id: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount_paise: number;
  currency: string;
  items: unknown;
  promo_code: string | null;
  status: string;
}

function parseStoredItems(items: unknown): DarkStoreCalculatedItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Stored payment intent has no items');
  }

  return items.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Stored payment intent has invalid items');
    }

    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const name = typeof record.name === 'string' ? record.name : '';
    const quantity = Number(record.quantity);
    const price = Number(record.price);
    const totalPrice = Number(record.totalPrice);

    if (
      !id ||
      !name ||
      !Number.isFinite(quantity) ||
      quantity < 1 ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(totalPrice) ||
      totalPrice < 0
    ) {
      throw new Error('Stored payment intent has invalid items');
    }

    return {
      id,
      name,
      quantity,
      price,
      totalPrice,
    };
  });
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

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

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

    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    const paymentInfo = await paymentResponse.json();

    if (!paymentResponse.ok || paymentInfo.status !== 'captured') {
      return NextResponse.json({ error: 'Payment not captured' }, { status: 400 });
    }

    if (paymentInfo.order_id !== razorpayOrderId) {
      return NextResponse.json({ error: 'Payment order mismatch' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: paymentIntentData, error: paymentIntentError } = await adminSupabase
      .from('payment_intents')
      .select('id, provider_order_id, provider_payment_id, amount_paise, currency, items, promo_code, status')
      .eq('provider_order_id', razorpayOrderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (paymentIntentError) {
      return NextResponse.json({ error: 'Unable to validate payment intent' }, { status: 500 });
    }

    const paymentIntent = paymentIntentData as PaymentIntentRow | null;

    if (!paymentIntent) {
      return NextResponse.json({ error: 'Payment intent not found' }, { status: 400 });
    }

    if (paymentIntent.status !== 'created' || paymentIntent.provider_payment_id) {
      return NextResponse.json({ error: 'Payment intent has already been used' }, { status: 409 });
    }

    if (Number(razorpayOrder.amount) !== paymentIntent.amount_paise || razorpayOrder.currency !== paymentIntent.currency) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    if (Number(paymentInfo.amount) !== paymentIntent.amount_paise || paymentInfo.currency !== paymentIntent.currency) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    const storedItems = parseStoredItems(paymentIntent.items);
    const subtotal = storedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = subtotal >= 99 ? 0 : 10;
    const totalBeforeDiscount = subtotal + deliveryFee;
    const finalAmount = paymentIntent.amount_paise / 100;
    const discountAmount = Math.max(0, Math.round((totalBeforeDiscount - finalAmount) * 100) / 100);
    const appliedPromoCode = paymentIntent.promo_code;

    const { data: existingOrder, error: existingOrderError } = await adminSupabase
      .from('orders')
      .select('id')
      .eq('payment_id', razorpayPaymentId)
      .maybeSingle();

    if (existingOrderError) {
      return NextResponse.json({ error: 'Unable to validate payment replay' }, { status: 500 });
    }

    if (existingOrder) {
      return NextResponse.json({ error: 'Payment has already been used for an order' }, { status: 409 });
    }

    const orderNumber = `DS${Date.now().toString().slice(-8)}`;
    const checkoutItems = storedItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const { data: createdOrder, error: orderInsertError } = await adminSupabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        order_type: 'store',
        status: 'pending',
        total_amount: totalBeforeDiscount,
        delivery_fee: deliveryFee,
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

    const orderItemsPayload = storedItems.map((item) => ({
      order_id: createdOrder.id,
      item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
      total_price: item.totalPrice,
    }));

    const { error: orderItemsError } = await adminSupabase.from('order_items').insert(orderItemsPayload);

    if (orderItemsError) {
      return NextResponse.json({ error: 'Failed to persist order items' }, { status: 500 });
    }

    const { error: intentUpdateError } = await adminSupabase
      .from('payment_intents')
      .update({
        status: 'paid',
        provider_payment_id: razorpayPaymentId,
      })
      .eq('id', paymentIntent.id)
      .eq('status', 'created');

    if (intentUpdateError) {
      return NextResponse.json({ error: 'Failed to update payment intent' }, { status: 500 });
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
