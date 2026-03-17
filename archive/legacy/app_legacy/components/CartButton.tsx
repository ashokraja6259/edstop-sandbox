'use client'

import { useCart } from '@/app/context/CartContext'
import { useRouter } from 'next/navigation'

export default function CartButton() {
  const { cart } = useCart()
  const router = useRouter()

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  if (totalItems === 0) return null

  return (
    <button
      onClick={() => router.push('/cart')}
      className="fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-full shadow-lg"
    >
      Cart ({totalItems})
    </button>
  )
}