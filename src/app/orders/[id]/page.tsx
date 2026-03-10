// FILE: src/app/orders/[id]/page.tsx

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OrderDetailsPage({ params }: any) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!order || error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Order Not Found</h1>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id,item_name,quantity,price,total_price")
    .eq("order_id", order.id);

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1>Order #{order.order_number}</h1>

      <div style={{ marginTop: 20 }}>
        <p>
          <strong>Status:</strong> {order.status}
        </p>

        <p>
          <strong>Payment Method:</strong> {order.payment_method}
        </p>

        <p>
          <strong>Total:</strong> ₹{order.total_amount}
        </p>

        <p>
          <strong>Final:</strong> ₹{order.final_amount}
        </p>
      </div>

      <h3 style={{ marginTop: 30 }}>Items</h3>

      {!items || items.length === 0 ? (
        <p>No items found</p>
      ) : (
        <ul style={{ marginTop: 10 }}>
          {items.map((item: any) => (
            <li key={item.id} style={{ marginBottom: 8 }}>
              {item.item_name} × {item.quantity} — ₹{item.total_price}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}