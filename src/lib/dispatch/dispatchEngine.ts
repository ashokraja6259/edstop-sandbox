import { createClient } from "@/lib/supabase/server";

export async function dispatchOrder(orderId: string) {

  if (!orderId) {
    throw new Error("Order ID is required for dispatch");
  }

  const supabase = await createClient();

  /* ================= CALL BATCH DISPATCH FUNCTION ================= */

  const { data: riderId, error } = await supabase.rpc(
    "batch_assign_orders",
    {
      p_order_id: orderId
    }
  );

  if (error) {

    console.error("Dispatch RPC failed:", error);

    throw new Error(
      error.message || "Dispatch failed"
    );

  }

  /* ================= NO RIDER AVAILABLE ================= */

  if (!riderId) {

    console.warn(
      `No rider available for order ${orderId}`
    );

    return null;

  }

  /* ================= SUCCESS ================= */

  console.log(
    `Order ${orderId} assigned to rider ${riderId}`
  );

  return riderId;

}