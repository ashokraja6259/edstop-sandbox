import { createClient } from "@/lib/supabase/server";
import { isValidTransition, OrderStatus } from "@/lib/orderStatusMachine";
import { dispatchOrder } from "@/lib/dispatch/dispatchEngine";

function getEventType(status: OrderStatus) {
  switch (status) {
    case "confirmed":
      return "ORDER_CONFIRMED";
    case "preparing":
      return "ORDER_PREPARING";
    case "ready":
      return "ORDER_READY";
    case "out_for_delivery":
      return "ORDER_PICKED_UP";
    case "delivered":
      return "ORDER_DELIVERED";
    case "cancelled":
      return "ORDER_CANCELLED";
    default:
      return "ORDER_UPDATED";
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
) {

  const supabase = await createClient();

  /* ================= GET CURRENT ORDER ================= */

  const { data: order, error } = await supabase
    .from("orders")
    .select("status, rider_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("Order not found");
  }

  const currentStatus = order.status as OrderStatus;

  /* ================= VALIDATE TRANSITION ================= */

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${newStatus}`
    );
  }

  /* ================= UPDATE ORDER ================= */

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  /* ================= CREATE EVENT ================= */

  await supabase
    .from("order_events")
    .insert({
      order_id: orderId,
      event_type: getEventType(newStatus),
      old_status: currentStatus,
      new_status: newStatus
    });

  /* ================= DISPATCH RIDER ================= */

  if (newStatus === "ready") {

    try {

      await dispatchOrder(orderId);

    } catch (err) {

      console.error("Dispatch failed:", err);

    }

  }

  /* ================= DELIVERY COMPLETION ================= */

  if (newStatus === "delivered" && order.rider_id) {

    const { data: rider } = await supabase
      .from("riders")
      .select("active_orders")
      .eq("id", order.rider_id)
      .single();

    if (rider) {

      const newActiveOrders =
        Math.max(0, (rider.active_orders || 1) - 1);

      await supabase
        .from("riders")
        .update({
          active_orders: newActiveOrders
        })
        .eq("id", order.rider_id);

    }

  }

  return true;

}