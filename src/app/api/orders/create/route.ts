import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOrder } from "@/lib/services/orderService";

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();

    const order = await createOrder(supabase, body);

    return NextResponse.json({
      success: true,
      orderId: order.id,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}