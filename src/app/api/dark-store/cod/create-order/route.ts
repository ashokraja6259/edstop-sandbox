import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDarkStorePricing, type DarkStoreCartInputItem } from '@/lib/dark-store/pricing';

interface CreateDarkStoreCodOrderBody {
  items: DarkStoreCartInputItem[];
  promoCode?: string | null;
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
    const orderNumber = `DS${Date.now().toString().slice(-8)}`;

    const checkoutItems = pricing.normalizedItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const adminSupabase = createAdminClient();

    const { data: createdOrder, error: orderInsertError } = await adminSupabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        order_type: 'store',
        status: 'pending',
        total_amount: pricing.totalBeforeDiscount,
        delivery_fee: pricing.deliveryFee,
        tax_amount: 0,
        discount_amount: discountAmount,
        promo_code: appliedPromoCode,
        promo_discount: discountAmount,
        final_amount: finalAmount,
        payment_method: 'cod',
        payment_id: null,
        wallet_used: 0,
        items: checkoutItems,
        notes: null,
      })
      .select('id, order_number')
      .single();

    if (orderInsertError || !createdOrder) {
      console.error('Dark-store COD order insert failed:', JSON.stringify(orderInsertError, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to create dark-store order',
          details: orderInsertError?.message,
          code: orderInsertError?.code,
          hint: orderInsertError?.hint,
        },
        { status: 500 }
      );
    }

    const orderItemsPayload = pricing.normalizedItems.map((item) => ({
      order_id: createdOrder.id,
      menu_item_id: null,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price,
      total_price: item.totalPrice,
    }));

    const { error: orderItemsError } = await adminSupabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (orderItemsError) {
      console.error('Dark-store COD order items insert failed:', JSON.stringify(orderItemsError, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to save dark-store order items',
          details: orderItemsError.message,
          code: orderItemsError.code,
          hint: orderItemsError.hint,
        },
        { status: 500 }
      );
    }

    const { error: orderEventError } = await adminSupabase.from('order_events').insert({
      order_id: createdOrder.id,
      event_type: 'ORDER_CREATED',
      old_status: null,
      new_status: 'pending',
      metadata: {
        payment_method: 'cod',
        order_type: 'store',
      },
    });

    if (orderEventError) {
      console.error('Dark-store COD order event insert failed:', JSON.stringify(orderEventError, null, 2));
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
    console.error('Dark-store COD create-order fatal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create dark-store COD order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}