import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/services/orderService";

interface CreateOrderCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CreateOrderRequestBody {
  cartItems: Array<{
    id: string;
    name?: string;
    price?: number;
    quantity: number;
  }>;
  restaurantId: string;
  paymentMethod: "razorpay" | "cod";
  walletAmount?: number;
  promoCode?: string | null;
  idempotencyKey?: string | null;
}

export async function POST(req: Request) {

  try {

    const supabase = await createClient();

    /* ================= AUTH ================= */

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    /* ================= PARSE BODY ================= */

    let body: CreateOrderRequestBody;

    try {
      body = (await req.json()) as CreateOrderRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      cartItems,
      restaurantId,
      paymentMethod,
      walletAmount,
      promoCode,
      idempotencyKey
    } = body;

    /* ================= VALIDATION ================= */

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Cart cannot be empty" },
        { status: 400 }
      );
    }

    if (!restaurantId || typeof restaurantId !== "string") {
      return NextResponse.json(
        { error: "Restaurant ID missing" },
        { status: 400 }
      );
    }

    /* prevent mock ids like r1 */
    if (restaurantId.startsWith("r")) {
      return NextResponse.json(
        { error: "Invalid restaurant ID" },
        { status: 400 }
      );
    }

    if (!["razorpay", "cod"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    const normalizedCartItems: CreateOrderCartItem[] = cartItems.map((item) => ({
      id: item.id,
      name: typeof item.name === "string" ? item.name : "",
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));

    if (
      normalizedCartItems.some((item) =>
        !item.id ||
        !item.name ||
        !Number.isFinite(item.price) ||
        item.price < 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      )
    ) {
      return NextResponse.json(
        { error: "Invalid cart items" },
        { status: 400 }
      );
    }

    const safeWalletAmount = Math.max(
      0,
      Number(walletAmount) || 0
    );

    if (
      idempotencyKey !== undefined &&
      idempotencyKey !== null &&
      (typeof idempotencyKey !== "string" || idempotencyKey.length > 128)
    ) {
      return NextResponse.json(
        { error: "Invalid idempotency key" },
        { status: 400 }
      );
    }

    /* ================= CREATE ORDER ================= */

    const order = await createOrder(supabase, {
      userId: user.id,
      cartItems: normalizedCartItems,
      restaurantId,
      paymentMethod,
      walletAmount: safeWalletAmount,
      promoCode: promoCode || null,
      idempotencyKey: idempotencyKey || null
    });

    if (!order?.id) {
      throw new Error("Order creation failed");
    }

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      success: true,
      orderId: order.id
    });

  } catch (error: unknown) {

    console.error("Order creation error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create order";

    return NextResponse.json(
      {
        error: message
      },
      { status: 500 }
    );

  }

}
