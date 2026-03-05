export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],

  confirmed: ["preparing", "cancelled"],

  preparing: ["ready", "cancelled"],

  ready: ["out_for_delivery"],

  out_for_delivery: ["delivered"],

  delivered: [],

  cancelled: []
};

/* ================= VALIDATE STATUS TRANSITION ================= */

export function isValidTransition(
  current: OrderStatus,
  next: OrderStatus
): boolean {

  /* allow idempotent updates */
  if (current === next) return true;

  const allowed = allowedTransitions[current];

  if (!allowed) return false;

  return allowed.includes(next);
}

/* ================= TERMINAL STATUS CHECK ================= */

export function isFinalStatus(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

/* ================= STATUS PROGRESSION ORDER ================= */

export const statusFlow: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered"
];