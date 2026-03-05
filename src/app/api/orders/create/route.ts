import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/services/orderService";

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

    let body: any;

    try {
      body = await req.json();
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
      promoDiscount
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

    const safeWalletAmount = Math.max(
      0,
      Number(walletAmount) || 0
    );

    const safePromoDiscount = Math.max(
      0,
      Number(promoDiscount) || 0
    );

    /* ================= CREATE ORDER ================= */

    const order = await createOrder(supabase, {
      userId: user.id,
      cartItems,
      restaurantId,
      paymentMethod,
      walletAmount: safeWalletAmount,
      promoCode: promoCode || null,
      promoDiscount: safePromoDiscount
    });

    if (!order?.id) {
      throw new Error("Order creation failed");
    }

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      success: true,
      orderId: order.id
    });

  } catch (error: any) {

    console.error("Order creation error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to create order"
      },
      { status: 500 }
    );

  }

}