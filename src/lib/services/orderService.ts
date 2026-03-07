import { SupabaseClient } from "@supabase/supabase-js";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

type PaymentMethod = "cod" | "razorpay";

interface CreateOrderInput {
  userId: string;
  restaurantId: string;
  cartItems: CartItem[];
  paymentMethod: PaymentMethod;
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
    promoDiscount = 0
  } = input;

  /* ================= VALIDATION ================= */

  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  if (!restaurantId) {
    throw new Error("Restaurant not selected");
  }

  /* ================= VERIFY RESTAURANT ================= */

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    throw new Error("Invalid restaurant");
  }

  /* ================= CALCULATE TOTAL ================= */

  const subtotal = cartItems.reduce((sum, item) => {

    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;

    return sum + price * quantity;

  }, 0);

  if (subtotal <= 0) {
    throw new Error("Invalid order amount");
  }

  const safeWalletAmount = Math.max(0, Number(walletAmount) || 0);
  const safePromoDiscount = Math.max(0, Number(promoDiscount) || 0);

  const finalAmount = Math.max(
    0,
    subtotal - safeWalletAmount - safePromoDiscount
  );

  /* ================= ORDER NUMBER ================= */

  const orderNumber =
    `ED${Date.now()}${Math.floor(Math.random() * 1000)}`;

  /* ================= INITIAL STATUS ================= */

  const initialStatus = "pending";

  /* ================= CREATE ORDER ================= */

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      restaurant_id: restaurantId,
      order_number: orderNumber,
      order_type: "food",
      status: initialStatus,
      total_amount: subtotal,
      discount_amount: safePromoDiscount,
      promo_code: promoCode,
      promo_discount: safePromoDiscount,
      final_amount: finalAmount,
      payment_method: paymentMethod,
      wallet_used: safeWalletAmount
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || "Failed to create order");
  }

  /* ================= INSERT ORDER ITEMS ================= */

  const orderItems = cartItems.map(item => ({
    order_id: order.id,
    menu_item_id: item.id,
    item_name: item.name,
    quantity: item.quantity,
    price: item.price,
    total_price: item.price * item.quantity
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  /* ================= WALLET HANDLING ================= */

  if (safeWalletAmount > 0) {

    const { data: wallet, error: walletFetchError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (walletFetchError || !wallet) {
      throw new Error("Wallet not found");
    }

    const currentBalance = Number(wallet.balance) || 0;

    if (currentBalance < safeWalletAmount) {
      throw new Error("Insufficient wallet balance");
    }

    const newBalance = currentBalance - safeWalletAmount;

    const { error: walletUpdateError } = await supabase
      .from("wallets")
      .update({
        balance: newBalance
      })
      .eq("user_id", userId);

    if (walletUpdateError) {
      throw new Error(walletUpdateError.message);
    }

    const { error: ledgerError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        amount: -safeWalletAmount,
        type: "order_payment",
        reference_id: order.id,
        description: `Wallet used for order ${orderNumber}`
      });

    if (ledgerError) {
      throw new Error(ledgerError.message);
    }

  }

  /* ================= ORDER EVENT ================= */

  const { error: eventError } = await supabase
    .from("order_events")
    .insert({
      order_id: order.id,
      event_type: "ORDER_CREATED",
      old_status: null,
      new_status: initialStatus,
      metadata: {
        payment_method: paymentMethod,
        wallet_used: safeWalletAmount
      }
    });

  if (eventError) {
    console.error("Order event insert failed:", eventError);
  }

  return order;
}