// FILE: src/app/api/orders/[id]/page.tsx

import { createClient } from '@/lib/supabase/server';

interface Props {
  params: { id: string };
}

export default async function OrderDetailsPage({ params }: Props) {
  const supabase = await createClient(); // ✅ uses secure server client

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !order) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold">Order Not Found</h1>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Order #{order.order_number}
      </h1>

      <div className="space-y-2 text-sm">
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Total:</strong> ₹{order.total_amount}</p>
        <p><strong>Final Amount:</strong> ₹{order.final_amount}</p>
        <p><strong>Payment:</strong> {order.payment_method}</p>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Items</h2>
        <ul className="space-y-2">
          {order.items?.map((item: any, index: number) => (
            <li key={index} className="border p-2 rounded">
              {item.name} × {item.quantity} — ₹{item.price}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}