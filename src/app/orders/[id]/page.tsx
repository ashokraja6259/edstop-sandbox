import { createClient } from "@supabase/supabase-js";

export default async function OrderDetailsPage({ params }: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!order) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Order Not Found</h1>
        <p>ID: {params.id}</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Order #{order.order_number}</h1>
      <p>Status: {order.status}</p>
      <p>Total: ₹{order.total_amount}</p>
      <p>Final: ₹{order.final_amount}</p>

      <h3>Items</h3>
      <pre>{JSON.stringify(order.items, null, 2)}</pre>
    </div>
  );
}