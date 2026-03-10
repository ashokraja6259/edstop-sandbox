// FILE: src/app/orders/[id]/page.tsx

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: { id: string };
}

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  price: number;
  total_price: number;
}

export default async function OrderDetailsPage({ params }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, status, total_amount, final_amount, payment_method, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (orderError || !order) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">Order Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This order does not exist, or you do not have permission to view it.
          </p>
        </div>
      </div>
    );
  }

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, item_name, quantity, price, total_price')
    .eq('order_id', order.id)
    .returns<OrderItem[]>();

  const items = orderItems || [];

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Order #{order.order_number}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Placed on {new Date(order.created_at).toLocaleString()}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Status</p>
            <p className="font-semibold text-slate-900 capitalize">{order.status}</p>
          </div>
          <div>
            <p className="text-slate-500">Payment</p>
            <p className="font-semibold text-slate-900 uppercase">{order.payment_method}</p>
          </div>
          <div>
            <p className="text-slate-500">Subtotal</p>
            <p className="font-semibold text-slate-900">₹{Number(order.total_amount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-500">Final Amount</p>
            <p className="font-semibold text-slate-900">₹{Number(order.final_amount).toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <h2 className="font-semibold text-slate-900">Items</h2>

          {items.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No items found for this order.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.item_name}</p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity} × ₹{Number(item.price).toFixed(2)}</p>
                  </div>
                  <p className="font-semibold text-slate-900">₹{Number(item.total_price).toFixed(2)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
