'use client';

import { useState, useEffect } from 'react';
import HeaderBrand from '@/components/common/HeaderBrand';
import WalletIndicator from '@/components/common/WalletIndicator';
import RestaurantCard from './RestaurantCard';
import MenuItemCard from './MenuItemCard';
import CartSummary from './CartSummary';
import CheckoutModal from './CheckoutModal';
import DeliveryTracker from './DeliveryTracker';
import Icon from '@/components/ui/AppIcon';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import OrderSuccessModal from '@/components/ui/OrderSuccessModal';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import useDeliveryTracking from '@/hooks/useDeliveryTracking';
import { useFoodOrderingRealtime } from '@/hooks/useFoodOrderingRealtime';

interface Variant {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  isVeg: boolean;
  variants?: Variant[];
  customizable: boolean;
  category: string;
}

interface Restaurant {
  id: string;
  name: string;
  image: string;
  alt: string;
  cuisines: string[];
  rating: number;
  deliveryTime: string;
  minimumOrder: number;
  menu: MenuItem[];
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantName?: string;
  restaurantId: string;
}

const FoodOrderingInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{ orderId: string; paymentMethod: string; walletUsed: number; total: number; promoCode?: string; promoDiscount?: number } | null>(null);
  const [cuisineFilter, setCuisineFilter] = useState<string>('All');
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<'api' | 'network' | 'generic'>('generic');
  const [restaurantSelectionError, setRestaurantSelectionError] = useState<string>('');
  const [orderDetailsError, setOrderDetailsError] = useState<string>('');
  const [cuisineFilterError, setCuisineFilterError] = useState<string>('');
  const [hasOrderDetailsError, setHasOrderDetailsError] = useState(false);
  const [hasCuisineFilterError, setHasCuisineFilterError] = useState(false);
  // Real-time delivery tracking state
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [showTracker, setShowTracker] = useState(false);

  const { retry, manualRetry, reset, isRetrying, retryCount, nextRetryIn, maxRetriesReached } = useRetry({
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: async () => {
      setHasError(false);
      setErrorType('generic');
    },
  });

  const toast = useToast();
  const { user } = useAuth();

  // Real-time delivery tracking hook
  const { delivery, isLoading: trackingLoading } = useDeliveryTracking(
    trackedOrderId,
    user?.id
  );

  // Real-time food ordering: live prices, restaurant availability, stock, order confirmations
  const { menuPrices, restaurantStatuses, orderConfirmation, isLive, clearOrderConfirmation } =
    useFoodOrderingRealtime(user?.id, trackedOrderId);

  const walletBalance = 500.00;
  const minimumOrder = 149;
  const freeDeliveryThreshold = 399;
  const deliveryFeeBelow = 10;
  const convenienceFee = 10;
  const cashbackRate = 0.05;
  const maxWalletRedemptionRate = 0.30;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      reset();
      setHasError(false);
    };
    const handleOffline = () => {
      setHasError(true);
      setErrorType('network');
      retry();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [retry, reset]);

  const handleRetry = () => { manualRetry(true); };

  const mockRestaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'Spice Garden',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_15f7fdcf6-1765260335762.png",
    alt: 'Modern Indian restaurant interior with warm lighting and traditional decor',
    cuisines: ['North Indian', 'Chinese', 'Tandoor'],
    rating: 4.5,
    deliveryTime: '25-30 min',
    minimumOrder: 149,
    menu: [
    {
      id: 'm1',
      name: 'Paneer Butter Masala',
      description: 'Cottage cheese cubes cooked in rich tomato-based gravy with butter and cream',
      price: 180,
      image: "https://images.unsplash.com/photo-1615957506910-91ab837cd8aa",
      alt: 'Bowl of creamy paneer butter masala with visible cottage cheese cubes in orange gravy',
      isVeg: true,
      customizable: true,
      category: 'Main Course',
      variants: [
      { id: 'v1', name: 'Regular', price: 180 },
      { id: 'v2', name: 'Large', price: 250 }]

    },
    {
      id: 'm2',
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice layered with tender chicken pieces and traditional spices',
      price: 220,
      image: "https://images.unsplash.com/photo-1708714540126-5d6dd6b5fd7f",
      alt: 'Plate of golden chicken biryani with visible rice grains and chicken pieces',
      isVeg: false,
      customizable: false,
      category: 'Main Course'
    },
    {
      id: 'm3',
      name: 'Veg Manchurian',
      description: 'Deep-fried vegetable balls tossed in spicy Indo-Chinese sauce',
      price: 150,
      image: "https://img.rocket.new/generatedImages/rocket_gen_img_16f49b7fc-1766424138016.png",
      alt: 'Bowl of vegetable manchurian balls in dark brown sauce with green onions',
      isVeg: true,
      customizable: true,
      category: 'Starters'
    },
    {
      id: 'm4',
      name: 'Garlic Naan',
      description: 'Soft leavened bread topped with fresh garlic and butter',
      price: 40,
      image: "https://images.unsplash.com/photo-1613308807587-5a70f1331b5b",
      alt: 'Stack of golden garlic naan bread with visible garlic pieces',
      isVeg: true,
      customizable: false,
      category: 'Breads'
    }]

  },
  {
    id: 'r2',
    name: 'Pizza Paradise',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e6385995-1765355658216.png",
    alt: 'Italian pizzeria with wood-fired oven and rustic brick walls',
    cuisines: ['Italian', 'Pizza', 'Pasta'],
    rating: 4.3,
    deliveryTime: '30-35 min',
    minimumOrder: 149,
    menu: [
    {
      id: 'm5',
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella cheese, and fresh basil',
      price: 280,
      image: "https://images.unsplash.com/photo-1651978595428-7c4f175219d0",
      alt: 'Whole margherita pizza with melted cheese and basil leaves on wooden board',
      isVeg: true,
      customizable: true,
      category: 'Pizza',
      variants: [
      { id: 'v3', name: 'Medium', price: 280 },
      { id: 'v4', name: 'Large', price: 420 }]

    },
    {
      id: 'm6',
      name: 'Chicken Pepperoni',
      description: 'Loaded with chicken pepperoni slices and extra cheese',
      price: 350,
      image: "https://images.unsplash.com/photo-1588959286493-eb5582aa5f39",
      alt: 'Pepperoni pizza with visible meat slices and melted cheese',
      isVeg: false,
      customizable: true,
      category: 'Pizza',
      variants: [
      { id: 'v5', name: 'Medium', price: 350 },
      { id: 'v6', name: 'Large', price: 520 }]

    },
    {
      id: 'm7',
      name: 'Pasta Alfredo',
      description: 'Creamy white sauce pasta with herbs and parmesan',
      price: 200,
      image: "https://images.unsplash.com/photo-1613550893753-f87025cc892f",
      alt: 'Bowl of creamy white pasta alfredo with visible herbs on top',
      isVeg: true,
      customizable: true,
      category: 'Pasta'
    }]

  },
  {
    id: 'r3',
    name: 'Burger Hub',
    image: "https://images.unsplash.com/photo-1618659230951-945f40ddebfd",
    alt: 'Modern burger restaurant with neon signs and industrial decor',
    cuisines: ['American', 'Burgers', 'Fast Food'],
    rating: 4.2,
    deliveryTime: '20-25 min',
    minimumOrder: 149,
    menu: [
    {
      id: 'm8',
      name: 'Classic Veg Burger',
      description: 'Crispy vegetable patty with lettuce, tomato, and special sauce',
      price: 120,
      image: "https://images.unsplash.com/photo-1584947468845-71bb937e9458",
      alt: 'Tall vegetarian burger with visible layers of vegetables and sauce',
      isVeg: true,
      customizable: true,
      category: 'Burgers'
    },
    {
      id: 'm9',
      name: 'Chicken Deluxe',
      description: 'Grilled chicken patty with cheese, bacon, and BBQ sauce',
      price: 180,
      image: "https://images.unsplash.com/photo-1639020715395-487e2d63b927",
      alt: 'Chicken burger with melted cheese and bacon visible between buns',
      isVeg: false,
      customizable: true,
      category: 'Burgers'
    },
    {
      id: 'm10',
      name: 'French Fries',
      description: 'Crispy golden fries with seasoning',
      price: 80,
      image: "https://images.unsplash.com/photo-1600339240932-226cff938b4f",
      alt: 'Basket of golden crispy french fries with salt seasoning',
      isVeg: true,
      customizable: false,
      category: 'Sides',
      variants: [
      { id: 'v7', name: 'Regular', price: 80 },
      { id: 'v8', name: 'Large', price: 120 }]

    }]

  },
  {
    id: 'r4',
    name: 'South Spice',
    image: "https://images.unsplash.com/photo-1652317002788-fbea05ab207b",
    alt: 'Traditional South Indian restaurant with banana leaf decor',
    cuisines: ['South Indian', 'Dosa', 'Idli'],
    rating: 4.6,
    deliveryTime: '25-30 min',
    minimumOrder: 149,
    menu: [
    {
      id: 'm11',
      name: 'Masala Dosa',
      description: 'Crispy rice crepe filled with spiced potato filling',
      price: 90,
      image: "https://images.unsplash.com/photo-1694849789325-914b71ab4075",
      alt: 'Golden crispy masala dosa on banana leaf with chutneys',
      isVeg: true,
      customizable: false,
      category: 'Main Course'
    },
    {
      id: 'm12',
      name: 'Idli Sambar',
      description: 'Steamed rice cakes served with lentil soup and chutneys',
      price: 70,
      image: "https://images.unsplash.com/photo-1625398407798-3adf2524a74a",
      alt: 'White steamed idlis in bowl with sambar and coconut chutney',
      isVeg: true,
      customizable: false,
      category: 'Breakfast'
    }]

  }];


  const allCuisines = ['All', ...Array.from(new Set(mockRestaurants.flatMap((r) => r.cuisines)))];

  const filteredRestaurants = cuisineFilter === 'All' ?
  mockRestaurants :
  mockRestaurants.filter((r) => r.cuisines.includes(cuisineFilter));

  const selectedRestaurantData = mockRestaurants.find((r) => r.id === selectedRestaurant);

  // Derive restaurant slug from id for realtime lookup
  const selectedRestaurantSlug = selectedRestaurantData
    ? selectedRestaurantData.name.toLowerCase().replace(/\s+/g, '-')
    : null;

  const categories = selectedRestaurantData ?
  ['All', ...Array.from(new Set(selectedRestaurantData.menu.map((item) => item.category)))] :
  [];

  // Apply live prices and availability to menu items
  const filteredMenu = (selectedRestaurantData?.menu.filter((item) =>
  selectedCategory === 'All' || item.category === selectedCategory
  ) || []).map((item) => {
    const liveKey = `${selectedRestaurantSlug}:${item.id}`;
    const live = menuPrices[liveKey];
    if (!live) return item;
    return {
      ...item,
      price: live.price,
      isAvailable: live.isAvailable,
      stockLevel: live.stockLevel,
    };
  });

  const handleAddToCart = (itemId: string, quantity: number, variantId?: string) => {
    if (!selectedRestaurantData) return;

    const menuItem = selectedRestaurantData.menu.find((item) => item.id === itemId);
    if (!menuItem) return;

    // Check if cart has items from different restaurant
    if (cart.length > 0 && cart[0].restaurantId !== selectedRestaurant) {
      alert('You can only order from one restaurant at a time. Please clear your cart first.');
      return;
    }

    const variant = menuItem.variants?.find((v) => v.id === variantId);
    const price = variant?.price || menuItem.price;
    const variantName = variant?.name;

    const cartItemId = variantId ? `${itemId}-${variantId}` : itemId;

    if (quantity === 0) {
      setCart(cart.filter((item) => item.id !== cartItemId));
    } else {
      const existingItem = cart.find((item) => item.id === cartItemId);
      if (existingItem) {
        setCart(cart.map((item) =>
        item.id === cartItemId ?
        { ...item, quantity } :
        item
        ));
      } else {
        setCart([...cart, {
          id: cartItemId,
          name: menuItem.name,
          quantity,
          price,
          variantName,
          restaurantId: selectedRestaurant!
        }]);
      }
    }
    toast.success('Added to cart', `${menuItem.name} added successfully`);
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const getCartQuantity = (itemId: string, variantId?: string) => {
    const cartItemId = variantId ? `${itemId}-${variantId}` : itemId;
    return cart.find((item) => item.id === cartItemId)?.quantity || 0;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFeeBelow;
  const cashback = subtotal * cashbackRate;
  const total = subtotal + deliveryFee + convenienceFee;
  const maxWalletRedemption = total * maxWalletRedemptionRate;
  const minimumOrderMet = subtotal >= minimumOrder;

  const handleCheckout = () => {
    if (!selectedRestaurant) {
      setRestaurantSelectionError('Please select a restaurant before proceeding to checkout.');
      setTimeout(() => setRestaurantSelectionError(''), 3000);
      toast.warning('Select a restaurant', 'Please choose a restaurant before checkout.');
      return;
    }
    setRestaurantSelectionError('');
    setIsCheckoutOpen(true);
  };

  const handleConfirmOrder = (paymentMethod: string, walletAmount: number, promoCode?: string, promoDiscount?: number) => {
    setIsCheckoutOpen(false);
    const orderId = `ED${Date.now().toString().slice(-8)}`;
    const discount = promoDiscount ?? 0;
    const finalTotal = total - walletAmount - discount;
    setOrderDetails({ orderId, paymentMethod, walletUsed: walletAmount, total: finalTotal, promoCode, promoDiscount: discount > 0 ? discount : undefined });
    setOrderSuccess(true);
    setCart([]);
    toast.success('Order placed!', `Order #${orderId} confirmed. Estimated delivery: 25-35 min`);
    // Start real-time delivery tracking
    setTrackedOrderId(orderId);
    setShowTracker(true);
    // Clear any previous order confirmation
    clearOrderConfirmation();

  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 glass-strong border-b border-white/10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="animate-pulse h-8 bg-white/10 rounded-xl w-28"></div>
            <div className="animate-pulse h-8 bg-white/10 rounded-xl w-24"></div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Skeleton cuisine filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-9 bg-white/10 rounded-full w-24 flex-shrink-0"></div>)}
          </div>
          {/* Skeleton restaurant cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <div className="animate-pulse h-40 bg-white/10"></div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="animate-pulse h-5 bg-white/10 rounded w-32"></div>
                      <div className="animate-pulse h-3 bg-white/5 rounded w-24"></div>
                    </div>
                    <div className="animate-pulse h-6 bg-white/10 rounded-full w-12"></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="animate-pulse h-4 bg-white/5 rounded w-20"></div>
                    <div className="animate-pulse h-4 bg-white/5 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-50 glass-strong border-b border-white/10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <HeaderBrand />
            <WalletIndicator balance={walletBalance} />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <ErrorFallback
              type={errorType}
              onRetry={handleRetry}
              variant="glass"
              isRetrying={isRetrying}
              retryCount={retryCount}
              nextRetryIn={nextRetryIn}
              maxRetriesReached={maxRetriesReached}
              autoRetryEnabled={true}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-geometric">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <HeaderBrand showBackButton={true} />
              {isLive && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-success/10 border border-success/30 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="font-caption text-xs text-success font-medium">LIVE</span>
                </span>
              )}
            </div>
            <WalletIndicator balance={walletBalance} showDetails={true} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Restaurant List */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-heading font-bold text-3xl text-foreground mb-2">
                Order Food
              </h1>
              <p className="font-body text-text-secondary">
                Choose from our partner restaurants and enjoy campus delivery
              </p>
            </div>

            {/* Cuisine Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {allCuisines.map((cuisine) =>
              <button
                key={cuisine}
                onClick={() => setCuisineFilter(cuisine)}
                className={`
                    px-4 py-2 rounded-sm font-caption font-medium text-sm whitespace-nowrap
                    transition-smooth press-scale focus-ring
                    ${cuisineFilter === cuisine ?
                'bg-primary text-primary-foreground shadow-geometric' :
                'bg-muted text-text-secondary hover:bg-muted/80'}
                  `
                }>
                
                  {cuisine}
                </button>
              )}
            </div>

            {!selectedRestaurant ?
            <div className="space-y-4">
                {/* Restaurant selection inline error */}
                {restaurantSelectionError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl animate-slide-up">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                    <p className="font-caption text-xs text-destructive leading-relaxed">
                      {restaurantSelectionError}
                    </p>
                  </div>
                )}
                {hasError ? (
                  <ErrorFallback
                    type={errorType}
                    onRetry={handleRetry}
                    variant="card"
                    isRetrying={isRetrying}
                    retryCount={retryCount}
                    nextRetryIn={nextRetryIn}
                    maxRetriesReached={maxRetriesReached}
                    autoRetryEnabled={true}
                  />
                ) : filteredRestaurants.length === 0 ? (
                  <EmptyState
                    icon="🍽️"
                    title="No restaurants found"
                    description={cuisineFilter !== 'All' ? `No restaurants serving ${cuisineFilter} cuisine right now.` : 'No restaurants available at the moment.'}
                    actionLabel={cuisineFilter !== 'All' ? 'Show All Cuisines' : undefined}
                    onAction={cuisineFilter !== 'All' ? () => setCuisineFilter('All') : undefined}
                    variant="default"
                  />
                ) : (
                  filteredRestaurants.map((restaurant) => {
                    const slug = restaurant.name.toLowerCase().replace(/\s+/g, '-');
                    const liveStatus = restaurantStatuses[slug];
                    const isAvailable = liveStatus ? liveStatus.isAvailable : true;
                    const liveDeliveryTime = liveStatus ? liveStatus.deliveryTime : restaurant.deliveryTime;
                    return (
                      <RestaurantCard
                        key={restaurant.id}
                        {...restaurant}
                        deliveryTime={liveDeliveryTime}
                        isSelected={false}
                        isAvailable={isAvailable}
                        onClick={() => {
                          if (!isAvailable) {
                            toast.warning('Restaurant Unavailable', `${restaurant.name} is temporarily closed.`);
                            return;
                          }
                          setSelectedRestaurant(restaurant.id);
                        }}
                      />
                    );
                  })
                )}
              </div> :

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button
                  onClick={() => {
                    setSelectedRestaurant(null);
                    setSelectedCategory('All');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-sm hover:bg-muted/80 transition-smooth press-scale focus-ring">
                  
                    <Icon name="ArrowLeftIcon" size={16} />
                    <span className="font-caption font-medium text-sm">Back to Restaurants</span>
                  </button>
                </div>

                <div className="p-6 bg-card border border-border rounded-md shadow-geometric">
                  <div className="flex items-start gap-4">
                    <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                      <img
                      src={selectedRestaurantData?.image}
                      alt={selectedRestaurantData?.alt}
                      className="w-full h-full object-cover" />
                    
                    </div>
                    <div className="flex-1">
                      <h2 className="font-heading font-bold text-2xl text-foreground mb-2">
                        {selectedRestaurantData?.name}
                      </h2>
                      <p className="font-caption text-sm text-text-secondary mb-3">
                        {selectedRestaurantData?.cuisines.join(', ')}
                      </p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Icon name="StarIcon" size={16} variant="solid" className="text-warning" />
                          <span className="font-data text-sm font-medium text-foreground">
                            {selectedRestaurantData?.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon name="ClockIcon" size={16} className="text-text-secondary" />
                          <span className="font-caption text-sm text-text-secondary">
                            {selectedRestaurantData?.deliveryTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon name="CurrencyRupeeIcon" size={16} className="text-text-secondary" />
                          <span className="font-caption text-sm text-text-secondary">
                            ₹{selectedRestaurantData?.minimumOrder} minimum
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {categories.map((category) =>
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                        px-4 py-2 rounded-sm font-caption font-medium text-sm whitespace-nowrap
                        transition-smooth press-scale focus-ring
                        ${selectedCategory === category ?
                  'bg-primary text-primary-foreground shadow-geometric' :
                  'bg-muted text-text-secondary hover:bg-muted/80'}
                      `
                  }>
                  
                      {category}
                    </button>
                )}
                </div>

                {/* Menu Items */}
                <div className="space-y-4">
                  {hasError ? (
                    <ErrorFallback
                      type={errorType}
                      onRetry={handleRetry}
                      variant="card"
                      isRetrying={isRetrying}
                      retryCount={retryCount}
                      nextRetryIn={nextRetryIn}
                      maxRetriesReached={maxRetriesReached}
                      autoRetryEnabled={true}
                    />
                  ) : filteredMenu.length === 0 ? (
                    <EmptyState
                      icon="🍴"
                      title="No items found"
                      description={selectedCategory !== 'All' ? `No ${selectedCategory} items available.` : 'This restaurant has no menu items right now.'}
                      actionLabel={selectedCategory !== 'All' ? 'View All Items' : undefined}
                      onAction={selectedCategory !== 'All' ? () => setSelectedCategory('All') : undefined}
                      variant="default"
                    />
                  ) : (
                    filteredMenu.map((item) =>
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        onAddToCart={handleAddToCart}
                        cartQuantity={getCartQuantity(item.id)} />
                    )
                  )}
                </div>
              </div>
            }
          </div>

          {/* Cart Summary */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <CartSummary
              items={cart}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              convenienceFee={convenienceFee}
              cashback={cashback}
              total={total}
              onRemoveItem={handleRemoveItem}
              onCheckout={handleCheckout}
              minimumOrderMet={minimumOrderMet}
              minimumOrder={minimumOrder} />

            {/* Live Delivery Tracker */}
            {showTracker && (
              <div className="space-y-2">
                {trackingLoading ? (
                  <div className="p-4 bg-card border border-border rounded-md shadow-geometric animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-32 bg-muted rounded-sm" />
                        <div className="h-3 w-48 bg-muted rounded-sm" />
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full" />
                  </div>
                ) : delivery ? (
                  <DeliveryTracker
                    delivery={delivery}
                    onDismiss={() => {
                      if (delivery.status === 'delivered' || delivery.status === 'cancelled') {
                        setShowTracker(false);
                        setTrackedOrderId(null);
                      } else {
                        setShowTracker(false);
                      }
                    }}
                  />
                ) : (
                  // Fallback: show a simple status card when DB order not found (mock flow)
                  orderDetails && (
                    <div className="bg-card border border-primary/30 rounded-md shadow-geometric p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="font-caption text-xs text-primary font-medium">LIVE</span>
                          </span>
                          <span className="font-heading font-semibold text-sm text-foreground">
                            Order #{orderDetails.orderId}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowTracker(false)}
                          className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-muted transition-smooth"
                        >
                          <Icon name="XMarkIcon" size={14} className="text-text-secondary" />
                        </button>
                      </div>
                      {/* Progress steps */}
                      <div className="space-y-2">
                        {[
                          { icon: '📋', label: 'Order Placed', done: true },
                          { icon: '✅', label: 'Confirmed', done: false },
                          { icon: '👨‍🍳', label: 'Preparing', done: false },
                          { icon: '🛵', label: 'Out for Delivery', done: false },
                          { icon: '🎉', label: 'Delivered', done: false },
                        ].map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={`text-sm ${step.done ? 'opacity-100' : 'opacity-30'}`}>{step.icon}</span>
                            <span className={`font-caption text-xs ${step.done ? 'text-foreground font-medium' : 'text-text-secondary'}`}>
                              {step.label}
                            </span>
                            {step.done && idx === 0 && (
                              <Icon name="CheckCircleIcon" size={12} className="text-success ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-sm">
                        <Icon name="ClockIcon" size={12} className="text-primary" />
                        <span className="font-caption text-xs text-text-secondary">Estimated delivery: </span>
                        <span className="font-data text-xs font-medium text-foreground">25-35 min</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Order confirmation live update banner */}
      {orderConfirmation && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-card border border-success/40 rounded-md shadow-geometric-xl p-4 flex items-start gap-3">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-success/10 border border-success/30 rounded-full flex-shrink-0 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="font-caption text-xs text-success font-medium">LIVE</span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm text-foreground">
                Order #{orderConfirmation.orderNumber}
              </p>
              <p className="font-caption text-xs text-text-secondary capitalize">
                Status: {orderConfirmation.status.replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={clearOrderConfirmation}
              className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-muted transition-smooth flex-shrink-0"
            >
              <Icon name="XMarkIcon" size={14} className="text-text-secondary" />
            </button>
          </div>
        </div>
      )}

     {/* Checkout Modal */}
<CheckoutModal
  isOpen={isCheckoutOpen}
  onClose={() => setIsCheckoutOpen(false)}
  total={total}
  walletBalance={walletBalance}
  maxWalletRedemption={maxWalletRedemption}
  cartItems={cart}
  restaurantId={selectedRestaurant as string}
/>

      {orderDetails && (
        <OrderSuccessModal
          isOpen={orderSuccess}
          onClose={() => { setOrderSuccess(false); setOrderDetails(null); }}
          orderType="food"
          orderId={orderDetails.orderId}
          items={[{ name: 'Food Order', quantity: 1, price: orderDetails.total + (orderDetails.promoDiscount ?? 0) }]}
          total={orderDetails.total}
          paymentMethod={orderDetails.paymentMethod}
          walletUsed={orderDetails.walletUsed}
          estimatedTime="25-35 min"
          promoCode={orderDetails.promoCode}
          promoDiscount={orderDetails.promoDiscount}
        />
      )}
      
    </div>);

};

export default FoodOrderingInteractive;