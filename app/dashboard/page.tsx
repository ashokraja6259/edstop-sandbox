'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchRestaurants = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('*')

      setRestaurants(data || [])
    }

    fetchRestaurants()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Campus Restaurants
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {restaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            onClick={() => router.push(`/restaurant/${restaurant.id}`)}
            className="cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden"
          >
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="h-48 w-full object-cover"
            />

            <div className="p-4">
              <h2 className="text-lg font-semibold">
                {restaurant.name}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {restaurant.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}