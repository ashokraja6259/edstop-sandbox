import { SupabaseClient } from "@supabase/supabase-js";

interface CreateOrderInput {
  userId: string;
  restaurantId: string | null;
  cartItems: any[];
  paymentMethod: string;
  walletAmount?: number;
  promoCode?: string | null;
  promoDiscount?: number;
}

export async function createOrder(
  supabase: SupabaseClient,
  input: CreateOrderInput
) {
  const {
    userId,
    restaurantId,
    cartItems,
    paymentMethod,
    walletAmount = 0,
    promoCode = null,
    promoDiscount = 0,
  } = input;

  if (!cartItems.length) {
    throw new Error("Cart is empty");
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  if (subtotal <= 0) {
    throw new Error("Invalid order amount");
  }

  const finalAmount = Math.max(
    0,
    subtotal - Number(walletAmount) - Number(promoDiscount)
  );

  const orderNumber = `ED${Date.now().toString().slice(-8)}`;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      restaurant_id: null,
      order_number: orderNumber,
      order_type: "food",
      status: paymentMethod === "cod" ? "pending" : "awaiting_payment",
      total_amount: subtotal,
      discount_amount: promoDiscount,
      promo_code: promoCode,
      promo_discount: promoDiscount,
      final_amount: finalAmount,
      payment_method: paymentMethod,
      items: cartItems,
      wallet_used: walletAmount,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}