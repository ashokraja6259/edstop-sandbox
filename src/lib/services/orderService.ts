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
  idempotencyKey?: string | null;
}

interface AtomicCheckoutResult {
  order_id: string;
  idempotent_replay: boolean;
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
    idempotencyKey = null,
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

  /* ================= SERVER-SIDE ITEM VALIDATION ================= */

  const requestedItems = cartItems.map(item => ({
    id: item.id,
    quantity: Math.max(0, Number(item.quantity) || 0),
  }));

  if (requestedItems.some(item => !item.id || item.quantity < 1)) {
    throw new Error("Invalid cart item quantity");
  }

  const uniqueItemIds = [...new Set(requestedItems.map(item => item.id))];

  const { data: dbItems, error: dbItemsError } = await supabase
    .from("menu_items")
    .select("id, name, price, is_available, restaurant_id")
    .in("id", uniqueItemIds)
    .eq("restaurant_id", restaurantId);

  if (dbItemsError || !dbItems) {
    throw new Error("Failed to validate cart items");
  }

  if (dbItems.length !== uniqueItemIds.length) {
    throw new Error("Some cart items are invalid for this restaurant");
  }

  const menuItemMap = new Map(
    dbItems.map(item => [item.id, item])
  );

  const normalizedItems = requestedItems.map((requestedItem) => {
    const dbItem = menuItemMap.get(requestedItem.id);

    if (!dbItem || dbItem.is_available === false) {
      throw new Error("One or more items are unavailable");
    }

    const serverPrice = Number(dbItem.price) || 0;

    return {
      id: requestedItem.id,
      name: dbItem.name,
      quantity: requestedItem.quantity,
      price: serverPrice,
      totalPrice: serverPrice * requestedItem.quantity,
    };
  });

  const safeWalletAmount = Math.max(0, Number(walletAmount) || 0);

  /* ================= ATOMIC CHECKOUT WRITE ================= */

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_order_atomic",
    {
      p_user_id: userId,
      p_restaurant_id: restaurantId,
      p_payment_method: paymentMethod,
      p_items: normalizedItems,
      p_wallet_amount: safeWalletAmount,
      p_promo_code: promoCode,
      p_idempotency_key: idempotencyKey,
    }
  );

  if (rpcError) {
    throw new Error(rpcError.message || "Checkout transaction failed");
  }

  const result = rpcData as AtomicCheckoutResult | null;

  if (!result?.order_id) {
    throw new Error("Checkout transaction returned no order");
  }

  return {
    id: result.order_id,
    idempotentReplay: Boolean(result.idempotent_replay),
  };
}
