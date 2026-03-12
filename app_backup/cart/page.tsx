'use client'

import { useCart } from '@/app/context/CartContext'

export default function CartPage() {
  const { cart, addToCart, removeFromCart } = useCart()

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  if (cart.length === 0) {
    return <div>Your cart is empty.</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      <div className="space-y-4">
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm"
          >
            <div>
              <h2 className="font-medium">{item.name}</h2>
              <p className="text-sm text-gray-500">
                ₹{item.price} × {item.quantity}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => removeFromCart(item.id)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                -
              </button>

              <button
                onClick={() =>
                  addToCart({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                  })
                }
                className="px-3 py-1 bg-gray-200 rounded"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-right">
        <h2 className="text-xl font-semibold">
          Total: ₹{total}
        </h2>

        <button className="mt-4 bg-black text-white px-6 py-3 rounded-lg">
          Proceed to Checkout
        </button>
      </div>
    </div>
  )
}