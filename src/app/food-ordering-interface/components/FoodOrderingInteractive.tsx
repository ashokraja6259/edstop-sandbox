'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';

import HeaderBrand from '@/components/common/HeaderBrand';
import WalletIndicator from '@/components/common/WalletIndicator';
import RestaurantCard from './RestaurantCard';
import MenuItemCard from './MenuItemCard';
import CartSummary from './CartSummary';
import CheckoutModal from './CheckoutModal';
import DeliveryTracker from './DeliveryTracker';
import Icon from '@/components/ui/AppIcon';

import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import useDeliveryTracking from '@/hooks/useDeliveryTracking';
import { useFoodOrderingRealtime } from '@/hooks/useFoodOrderingRealtime';

/* ================= TYPES ================= */

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string;
  is_veg: boolean;
  stock_level: number;
}

interface Restaurant {
  id: string;
  name: string;
  image_url: string | null;
  rating: number | null;
  delivery_time: string;
  minimum_order: number;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  restaurantId: string;
}

/* ================= COMPONENT ================= */

const FoodOrderingInteractive = () => {

  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const { user } = useAuth();

  /* ================= STATE ================= */

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [showTracker, setShowTracker] = useState(false);

  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);

  /* ================= REALTIME ================= */

  useFoodOrderingRealtime(user?.id);

  const { delivery } = useDeliveryTracking(
    trackedOrderId ?? '',
    user?.id
  );

  /* ================= LOAD RESTAURANTS ================= */

  useEffect(() => {

    const loadRestaurants = async () => {

      setLoadingRestaurants(true);

      const { data, error } = await supabase
        .from('restaurants')
        .select('id,name,image_url,rating,delivery_time,minimum_order')
        .eq('is_available', true)
        .order('name');

      if (error) {
        console.error(error);
        toast.error('Failed to load restaurants');
        setLoadingRestaurants(false);
        return;
      }

      setRestaurants(data ?? []);
      setLoadingRestaurants(false);

    };

    loadRestaurants();

  }, [supabase, toast]);

  /* ================= LOAD MENU ================= */

  useEffect(() => {

    if (!selectedRestaurant) return;

    const loadMenu = async () => {

      setLoadingMenu(true);

      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          description,
          price,
          original_price,
          image_url,
          category,
          is_veg,
          stock_level
        `)
        .eq('restaurant_id', selectedRestaurant)
        .eq('is_available', true)
        .gt('stock_level', 0)
        .order('category');

      if (error) {
        console.error(error);
        toast.error('Failed to load menu');
        setLoadingMenu(false);
        return;
      }

      setMenuItems(data ?? []);
      setLoadingMenu(false);

    };

    loadMenu();

  }, [selectedRestaurant, supabase, toast]);

  /* ================= CART ================= */

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const selectedRestaurantData = restaurants.find(
    r => r.id === selectedRestaurant
  );

  const minimumOrder = selectedRestaurantData?.minimum_order ?? 0;

  const minimumOrderMet = subtotal >= minimumOrder;

  /* ================= ADD TO CART ================= */

  const handleAddToCart = (itemId: string, quantity: number) => {

    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.stock_level <= 0) {
      toast.error('Item is out of stock');
      return;
    }

    if (quantity > item.stock_level) {
      toast.error(`Only ${item.stock_level} items available`);
      return;
    }

    setCart(prev => {

      const existing = prev.find(p => p.id === itemId);

      if (existing) {
        return prev.map(p =>
          p.id === itemId
            ? { ...p, quantity }
            : p
        );
      }

      return [
        ...prev,
        {
          id: itemId,
          name: item.name,
          quantity,
          price: item.price,
          restaurantId: selectedRestaurant!
        }
      ];
    });

  };

  /* ================= REMOVE ITEM ================= */

  const handleRemoveItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  /* ================= UPDATE QUANTITY ================= */

  const handleUpdateQuantity = (itemId: string, quantity: number) => {

    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    if (quantity > item.stock_level) {
      toast.error(`Only ${item.stock_level} items available`);
      return;
    }

    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity }
          : item
      )
    );

  };

  /* ================= RESTAURANT SWITCH ================= */

  const handleRestaurantSelect = (restaurantId: string) => {

    if (cart.length > 0 && restaurantId !== selectedRestaurant) {
      setCart([]);
    }

    setSelectedRestaurant(restaurantId);

  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-background">

      {/* HEADER */}

      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <HeaderBrand />
          <WalletIndicator balance={500} />
        </div>
      </header>

      {/* MAIN */}

      <main className="container mx-auto px-4 py-8">

        {!selectedRestaurant ? (

          <div className="space-y-4">

            <h1 className="text-3xl font-bold">
              Order Food
            </h1>

            {loadingRestaurants && (
              <p className="text-sm text-muted-foreground">
                Loading restaurants...
              </p>
            )}

            {restaurants.map(r => (

              <RestaurantCard
                key={r.id}
                id={r.id}
                name={r.name}
                image={r.image_url || ''}
                cuisines={[]}
                rating={r.rating || 0}
                deliveryTime={r.delivery_time}
                minimumOrder={r.minimum_order}
                isSelected={false}
                onClick={() => handleRestaurantSelect(r.id)}
              />

            ))}

          </div>

        ) : (

          <div className="grid lg:grid-cols-3 gap-6">

            {/* MENU */}

            <div className="lg:col-span-2 space-y-6">

              <button
                onClick={() => {
                  setSelectedRestaurant(null);
                  setCart([]);
                }}
                className="text-sm flex items-center gap-2"
              >
                <Icon name="ArrowLeftIcon" size={16} />
                Back
              </button>

              {loadingMenu && (
                <p className="text-sm text-muted-foreground">
                  Loading menu...
                </p>
              )}

              {menuItems.map(item => (

                <MenuItemCard
                  key={item.id}
                  item={{
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image: item.image_url || '',
                    alt: item.name,
                    isVeg: item.is_veg,
                    customizable: false,
                    category: item.category
                  }}
                  onAddToCart={handleAddToCart}
                  cartQuantity={
                    cart.find(c => c.id === item.id)?.quantity || 0
                  }
                />

              ))}

            </div>

            {/* CART */}

            <div>

              <CartSummary
                items={cart}
                subtotal={subtotal}
                deliveryFee={0}
                convenienceFee={10}
                cashback={0}
                total={subtotal + 10}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
                onCheckout={() => setIsCheckoutOpen(true)}
                minimumOrderMet={minimumOrderMet}
                minimumOrder={minimumOrder}
              />

              {showTracker && delivery && (
                <DeliveryTracker delivery={delivery} />
              )}

            </div>

          </div>

        )}

      </main>

      {/* CHECKOUT */}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        walletBalance={500}
        maxWalletRedemption={100}
        cartItems={cart}
        restaurantId={selectedRestaurant ?? ''}
      />

    </div>
  );
};

export default FoodOrderingInteractive;