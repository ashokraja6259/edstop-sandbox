'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function RestaurantPage() {
  const params = useParams()
  const restaurantId = Array.isArray(params.id)
    ? params.id[0]
    : params.id

  const [restaurant, setRestaurant] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()

      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)

      setRestaurant(restaurantData)
      setMenuItems(menuData || [])
    }

    if (restaurantId) {
      fetchData()
    }
  }, [restaurantId])

  if (!restaurant) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <img
        src={restaurant.image_url}
        className="h-60 w-full object-cover rounded-xl"
        alt={restaurant.name}
      />

      <h1 className="text-2xl font-bold mt-4">
        {restaurant.name}
      </h1>

      <p className="text-gray-600 mt-2">
        {restaurant.description}
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">
        Menu
      </h2>

      <div className="space-y-4">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm"
          >
            <div>
              <h3 className="font-medium">
                {item.name}
              </h3>
              <p className="text-sm text-gray-500">
                ₹{item.price}
              </p>
            </div>

            <button className="bg-black text-white px-4 py-2 rounded-lg">
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}