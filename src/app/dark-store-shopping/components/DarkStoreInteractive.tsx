'use client';

import { useState } from 'react';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function DarkStoreInteractive() {
  const [cartItems] = useState<CartItem[]>([]);

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-3">Dark Store Shopping</h1>
        <p className="text-gray-600 mb-6">
          This page was restored to a safe minimal version so the app can build and deploy.
          The full interactive dark-store UI needs to be reintroduced from a valid component version.
        </p>

        <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Current Status</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>Page is now a valid React client component</li>
            <li>Build blocker caused by invalid component export is removed</li>
            <li>Dark store feature can be rebuilt safely in the next step</li>
          </ul>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4">
          <h3 className="font-medium mb-2">Cart Preview</h3>
          {cartItems.length === 0 ? (
            <p className="text-sm text-gray-500">No items in cart yet.</p>
          ) : (
            <ul className="space-y-2">
              {cartItems.map((item) => (
                <li key={item.id} className="text-sm text-gray-700">
                  {item.name} × {item.quantity} — ₹{item.price * item.quantity}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}