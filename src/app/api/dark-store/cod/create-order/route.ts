import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDarkStorePricing, type DarkStoreCartInputItem } from '@/lib/dark-store/pricing';

interface CreateDarkStoreCodOrderBody {
  items: DarkStoreCartInputItem[];
  promoCode?: string | null;
  idempotencyKey?: string | null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const body = (await req.json()) as CreateDarkStoreCodOrderBody;
    const { items, promoCode = null, idempotencyKey } = body;

    if (
      typeof idempotencyKey !== 'string'
      || idempotencyKey.trim().length === 0
      || idempotencyKey.length > 128
    ) {
      return NextResponse.json(
        { error: 'A valid checkout idempotency key is required' },
        { status: 400 }
      );
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
    const checkoutItems = pricing.normalizedItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
    }));

    const adminSupabase = createAdminClient();

    const { data: rpcResult, error: orderError } = await adminSupabase.rpc(
      'create_dark_store_cod_order',
      {
        p_user_id: user.id,
        p_items: checkoutItems,
        p_total_amount: pricing.totalBeforeDiscount,
        p_delivery_fee: pricing.deliveryFee,
        p_discount_amount: discountAmount,
        p_promo_code: appliedPromoCode,
        p_idempotency_key: idempotencyKey.trim(),
      }
    );

    if (
      orderError
      || typeof rpcResult?.order_id !== 'string'
      || typeof rpcResult?.order_number !== 'string'
    ) {
      console.error('Dark-store COD atomic checkout failed:', orderError);
      return NextResponse.json(
        { error: 'Failed to create dark-store order' },
        { status: 500 }
      );
    }

    const createdOrder = {
      id: rpcResult.order_id,
      order_number: rpcResult.order_number,
      idempotentReplay: Boolean(rpcResult.idempotent_replay),
    };

    if (createdOrder.id.length === 0 || createdOrder.order_number.length === 0) {
      console.error('Dark-store COD atomic checkout returned an invalid result');
      return NextResponse.json(
        { error: 'Failed to create dark-store order' },
        { status: 500 }
      );
    }

    if (createdOrder.id && !createdOrder.idempotentReplay) {
      console.info('Dark-store COD order created', {
        orderId: createdOrder.id,
        userId: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      idempotentReplay: createdOrder.idempotentReplay,
      finalAmount,
      items: checkoutItems,
      promoCode: appliedPromoCode,
      promoDiscount: discountAmount || undefined,
    });
  } catch (error: unknown) {
    console.error('Dark-store COD create-order fatal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create dark-store COD order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
