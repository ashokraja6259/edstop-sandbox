'use client';

import { useState, useEffect, useMemo } from 'react';
import CategoryFilter from './CategoryFilter';
import SearchAndSort from './SearchAndSort';
import ProductCard from './ProductCard';
import ShoppingCart from './ShoppingCart';
import DarkStoreDeliveryTracker from './DarkStoreDeliveryTracker';
import Icon from '@/components/ui/AppIcon';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import OrderSuccessModal from '@/components/ui/OrderSuccessModal';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useDarkStoreRealtime } from '@/hooks/useDarkStoreRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  alt: string;
  stock: number;
  category: string;
  popularity: number;
}

interface Category {
  id: string;
  name: string;
  icon: 'ShoppingBagIcon' | 'CakeIcon' | 'BeakerIcon' | 'PencilIcon' | 'SparklesIcon';
  count: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  alt: string;
}

const DarkStoreInteractive = () => {
  const supabase = createSupabaseClient();
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'popularity' | 'availability'>('popularity');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<'api' | 'network' | 'generic'>('generic');
  const [isOnline, setIsOnline] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{ orderId: string; total: number; items: { name: string; quantity: number; price: number }[]; promoCode?: string; promoDiscount?: number } | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const { retry, manualRetry, reset, isRetrying, retryCount, nextRetryIn, maxRetriesReached, canRetry } = useRetry({
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: async () => {
      setHasError(false);
      setErrorType('generic');
    },
  });

  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (hasError && errorType === 'network') {
        reset();
        setHasError(false);
        setErrorType('generic');
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setHasError(true);
      setErrorType('network');
      retry();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [hasError, errorType, retry, reset]);

  const handleRetry = () => {
    manualRetry(true);
  };

  const walletBalance = 450.00;

  const categories: Category[] = [
  { id: 'all', name: 'All Items', icon: 'ShoppingBagIcon', count: 24 },
  { id: 'snacks', name: 'Snacks', icon: 'CakeIcon', count: 8 },
  { id: 'beverages', name: 'Beverages', icon: 'BeakerIcon', count: 6 },
  { id: 'stationery', name: 'Stationery', icon: 'PencilIcon', count: 5 },
  { id: 'essentials', name: 'Essentials', icon: 'SparklesIcon', count: 5 }];


  const products: Product[] = [
  {
    id: 'p1',
    name: 'Lay\'s Classic Salted Chips 52g',
    price: 20.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a486cad8-1768508028054.png",
    alt: 'Yellow packet of Lays classic salted potato chips on white background',
    stock: 15,
    category: 'snacks',
    popularity: 95
  },
  {
    id: 'p2',
    name: 'Coca-Cola 600ml Pet Bottle',
    price: 40.00,
    image: "https://images.unsplash.com/photo-1565071490860-6b5d94161623",
    alt: 'Red Coca-Cola plastic bottle with condensation droplets on dark surface',
    stock: 20,
    category: 'beverages',
    popularity: 92
  },
  {
    id: 'p3',
    name: 'Classmate Spiral Notebook A4',
    price: 65.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_167e22848-1764767023868.png",
    alt: 'Blue spiral bound notebook with ruled pages on wooden desk',
    stock: 12,
    category: 'stationery',
    popularity: 88
  },
  {
    id: 'p4',
    name: 'Colgate MaxFresh Toothpaste 150g',
    price: 85.00,
    image: "https://images.unsplash.com/photo-1604708194645-4c0f5a958b56",
    alt: 'Blue and white Colgate toothpaste tube standing upright on white surface',
    stock: 8,
    category: 'essentials',
    popularity: 85
  },
  {
    id: 'p5',
    name: 'Parle-G Gold Biscuits 200g',
    price: 25.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f45b93f0-1764867893118.png",
    alt: 'Yellow packet of Parle-G glucose biscuits with iconic girl logo',
    stock: 25,
    category: 'snacks',
    popularity: 98
  },
  {
    id: 'p6',
    name: 'Red Bull Energy Drink 250ml',
    price: 125.00,
    image: "https://images.unsplash.com/photo-1612635901022-20ae4c268753",
    alt: 'Silver and blue Red Bull energy drink can with logo on ice',
    stock: 10,
    category: 'beverages',
    popularity: 82
  },
  {
    id: 'p7',
    name: 'Reynolds Trimax Pen Pack of 10',
    price: 50.00,
    image: "https://images.unsplash.com/photo-1607316071469-e39010715604",
    alt: 'Pack of blue ballpoint pens arranged in row on white background',
    stock: 18,
    category: 'stationery',
    popularity: 90
  },
  {
    id: 'p8',
    name: 'Dettol Handwash Pump 200ml',
    price: 95.00,
    image: "https://images.unsplash.com/photo-1648127098017-7dd8c6832bd4",
    alt: 'Green Dettol liquid handwash bottle with pump dispenser',
    stock: 0,
    category: 'essentials',
    popularity: 87
  },
  {
    id: 'p9',
    name: 'Kurkure Masala Munch 90g',
    price: 30.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_11196000b-1765367841523.png",
    alt: 'Orange packet of Kurkure spicy masala flavored snacks',
    stock: 22,
    category: 'snacks',
    popularity: 91
  },
  {
    id: 'p10',
    name: 'Tropicana Orange Juice 1L',
    price: 110.00,
    image: "https://images.unsplash.com/photo-1599360889420-da1afaba9edc",
    alt: 'Orange Tropicana juice carton with fresh orange slice illustration',
    stock: 14,
    category: 'beverages',
    popularity: 86
  },
  {
    id: 'p11',
    name: 'Fevicol MR 50g Tube',
    price: 35.00,
    image: "https://images.unsplash.com/photo-1643648552339-45e9295e1489",
    alt: 'White Fevicol adhesive tube with red cap on craft supplies',
    stock: 16,
    category: 'stationery',
    popularity: 84
  },
  {
    id: 'p12',
    name: 'Vim Dishwash Bar 200g',
    price: 28.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_18b29fd45-1766903134981.png",
    alt: 'Green rectangular Vim dishwashing bar soap in wrapper',
    stock: 20,
    category: 'essentials',
    popularity: 89
  },
  {
    id: 'p13',
    name: 'Haldiram\'s Aloo Bhujia 200g',
    price: 55.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1351eab91-1765369362524.png",
    alt: 'Yellow packet of Haldirams crispy potato sev snack mix',
    stock: 3,
    category: 'snacks',
    popularity: 93
  },
  {
    id: 'p14',
    name: 'Bisleri Mineral Water 1L',
    price: 20.00,
    image: "https://images.unsplash.com/photo-1729926677747-1fa3f52c7452",
    alt: 'Clear plastic Bisleri water bottle with blue label',
    stock: 30,
    category: 'beverages',
    popularity: 96
  },
  {
    id: 'p15',
    name: 'Apsara Platinum Pencil Box',
    price: 45.00,
    image: "https://images.unsplash.com/photo-1599652301647-d5ee6100b577",
    alt: 'Box of graphite pencils with erasers on wooden surface',
    stock: 11,
    category: 'stationery',
    popularity: 83
  },
  {
    id: 'p16',
    name: 'Lizol Floor Cleaner 500ml',
    price: 105.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a16f6f92-1768475728568.png",
    alt: 'Purple Lizol disinfectant floor cleaner bottle with handle',
    stock: 7,
    category: 'essentials',
    popularity: 81
  },
  {
    id: 'p17',
    name: 'Britannia Good Day Cookies 100g',
    price: 35.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_139b64c2c-1764919655481.png",
    alt: 'Red packet of Britannia butter cookies with chocolate chips',
    stock: 19,
    category: 'snacks',
    popularity: 94
  },
  {
    id: 'p18',
    name: 'Frooti Mango Drink 200ml',
    price: 20.00,
    image: "https://images.unsplash.com/photo-1623252142788-82b5c024aeb1",
    alt: 'Yellow Frooti mango juice tetra pack with straw',
    stock: 24,
    category: 'beverages',
    popularity: 97
  },
  {
    id: 'p19',
    name: 'Camlin Whiteboard Marker Set',
    price: 75.00,
    image: "https://images.unsplash.com/photo-1704136815966-67bb81862166",
    alt: 'Set of colorful whiteboard markers in plastic case',
    stock: 9,
    category: 'stationery',
    popularity: 80
  },
  {
    id: 'p20',
    name: 'Harpic Toilet Cleaner 500ml',
    price: 95.00,
    image: "https://images.unsplash.com/photo-1513169310-1d06d8e21812",
    alt: 'Blue Harpic toilet bowl cleaner bottle with angled nozzle',
    stock: 12,
    category: 'essentials',
    popularity: 79
  },
  {
    id: 'p21',
    name: 'Uncle Chips Spicy Treat 60g',
    price: 20.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1040ff953-1771531661213.png",
    alt: 'Red packet of Uncle Chips spicy potato wafers',
    stock: 17,
    category: 'snacks',
    popularity: 88
  },
  {
    id: 'p22',
    name: 'Maaza Mango Drink 600ml',
    price: 40.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_19737a672-1767173731714.png",
    alt: 'Orange Maaza mango juice bottle with fruit illustration',
    stock: 15,
    category: 'beverages',
    popularity: 90
  },
  {
    id: 'p23',
    name: 'Stapler with 1000 Pins',
    price: 85.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_197573b92-1770364219938.png",
    alt: 'Black metal stapler with box of staple pins on desk',
    stock: 6,
    category: 'stationery',
    popularity: 77
  },
  {
    id: 'p24',
    name: 'Surf Excel Detergent 500g',
    price: 115.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1aadd29ae-1771952093587.png",
    alt: 'Blue Surf Excel washing powder packet with stain removal formula',
    stock: 10,
    category: 'essentials',
    popularity: 85
  }];


  // Build mock stock map for the realtime hook
  const mockStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => { map[p.id] = p.stock; });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Supabase real-time: live stock + delivery tracking ────────────────────
  const { liveStockMap, activeDelivery, isLoadingDelivery, statusConfig, steps } = useDarkStoreRealtime(
    user?.id,
    activeOrderId,
    mockStockMap
  );

  // Merge live stock overrides into products
  const productsWithLiveStock = useMemo(() => {
    return products.map((p) => ({
      ...p,
      stock: liveStockMap[p.id] !== undefined ? liveStockMap[p.id] : p.stock,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveStockMap]);

  const getFilteredAndSortedProducts = () => {
    let filtered = productsWithLiveStock;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'popularity':
          return b.popularity - a.popularity;
        case 'availability':
          if (a.stock === 0 && b.stock > 0) return 1;
          if (a.stock > 0 && b.stock === 0) return -1;
          return b.stock - a.stock;
        default:
          return 0;
      }
    });

    return sorted;
  };

  const filteredProducts = getFilteredAndSortedProducts();

  const cartItems: CartItem[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, quantity]) => {
      const product = productsWithLiveStock.find(p => p.id === id)!;
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
        alt: product.alt,
      };
    });

  const totalCartItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const handleAddToCart = (productId: string) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
    const product = productsWithLiveStock.find(p => p.id === productId);
    if (product) toast.success('Added to cart', `${product.name} added`);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => { const next = { ...prev }; delete next[productId]; return next; });
    } else {
      setCart(prev => ({ ...prev, [productId]: quantity }));
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => { const next = { ...prev }; delete next[productId]; return next; });
  };

  const handleCheckout = (promoCode?: string, promoDiscount?: number) => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      const orderId = `DS${Date.now().toString().slice(-8)}`;
      const checkoutItems = cartItems.map(item => ({ name: item.name, quantity: item.quantity, price: item.price }));
      const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const cartDeliveryFee = subtotal >= 99 ? 0 : 10;
      const discount = promoDiscount ?? 0;
      const orderTotal = subtotal + cartDeliveryFee;
      setOrderDetails({ orderId, total: orderTotal - discount, items: checkoutItems, promoCode, promoDiscount: discount > 0 ? discount : undefined });
      setOrderSuccess(true);
      setCart({});
      setActiveOrderId(orderId);
      toast.success('Order placed!', `Order #${orderId} confirmed. Delivery in 10-20 min`);

      // Persist order to Supabase
      if (user?.id) {
        supabase.from('orders').insert({
          user_id: user.id,
          order_number: orderId,
          order_type: 'store',
          status: 'pending',
          total_amount: orderTotal,
          delivery_fee: cartDeliveryFee,
          discount_amount: discount,
          promo_code: promoCode ?? null,
          promo_discount: discount,
          final_amount: Math.max(0, orderTotal - discount),
          payment_method: 'razorpay',
          items: checkoutItems,
          notes: null,
        }).then(({ error }: { error: Error | null }) => {
          if (error) console.error('Failed to save store order:', error.message);
        });
      }
    }, 1500);
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
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Skeleton category filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-9 bg-white/10 rounded-full w-24 flex-shrink-0"></div>)}
          </div>
          {/* Skeleton search */}
          <div className="animate-pulse h-12 bg-white/10 rounded-xl mb-6"></div>
          {/* Skeleton grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="animate-pulse h-28 bg-white/10 rounded-xl mb-3"></div>
                <div className="animate-pulse h-4 bg-white/10 rounded mb-2"></div>
                <div className="animate-pulse h-4 bg-white/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isOnline && !hasError) {
    setHasError(true);
    setErrorType('network');
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-indigo-900/5 pointer-events-none" />
      <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-float pointer-events-none" style={{animationDelay: '1s'}} />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-bold text-xl text-foreground">
              Dark Store
            </h1>
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-caption font-medium">
              10-20 min delivery
            </span>
          </div>
          
          {/* Cart button - Mobile */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="lg:hidden relative p-2 rounded-xl glass-neon hover-glow-purple transition-all duration-300 press-scale focus-ring"
          >
            <Icon name="ShoppingCartIcon" size={24} className="text-foreground" />
            {totalCartItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex max-w-[1920px] mx-auto">
        {/* Content Area */}
        <main className="flex-1 px-4 py-6 pb-24 lg:pb-6 max-w-6xl">
          {/* Hero Section */}
          <div className="relative mb-6 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-purple-900/30 border border-purple-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5" />
            <div className="relative p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl animate-float">⚡</span>
                <span className="font-caption text-xs font-bold text-purple-300 uppercase tracking-widest">Lightning Fast Delivery</span>
              </div>
              <h2 className="font-heading font-bold text-2xl text-white mb-1">
                Campus Store, <span className="text-gradient-purple">Delivered Fast</span>
              </h2>
              <p className="font-body text-sm text-purple-200/80">Snacks, beverages, stationery & essentials — delivered to your hostel in minutes</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="font-caption text-xs text-white/80">Free delivery above ₹99</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-400">💰</span>
                  <span className="font-caption text-xs text-white/80">5% EdCoins cashback</span>
                </div>
              </div>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-6xl animate-float opacity-30">🛒</div>
          </div>

          {/* Category Filter */}
          <div className="mb-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {/* Search and Sort */}
          <div className="mb-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
            <SearchAndSort
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4 animate-fade-in">
            <p className="font-caption text-sm text-text-secondary">
              <span className="text-primary font-bold">{filteredProducts.length}</span> products found
            </p>
            {searchQuery && (
              <span className="font-caption text-xs text-primary">Searching: &quot;{searchQuery}&quot;</span>
            )}
          </div>

          {/* Network/API Error Banner */}
          {hasError && (
            <ErrorFallback
              type={errorType}
              onRetry={handleRetry}
              isRetrying={isRetrying}
              retryCount={retryCount}
              nextRetryIn={nextRetryIn}
              maxRetriesReached={maxRetriesReached}
              autoRetryEnabled={true}
              className="mb-6"
            />
          )}

          {/* Products Grid */}
          {!hasError && filteredProducts.length === 0 ? (
            searchQuery || selectedCategory !== 'all' ? (
              <EmptyState
                icon="🔍"
                title="No products found"
                description={searchQuery ? `No results for "${searchQuery}". Try a different search term or category.` : 'No products in this category right now.'}
                actionLabel={searchQuery ? 'Clear Search' : 'View All'}
                onAction={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              />
            ) : (
              <EmptyState
                icon="🛒"
                title="Store is empty"
                description="No products available right now. Check back soon!"
              />
            )
          ) : !hasError ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className={`animate-slide-up stagger-${Math.min((index % 6) + 1, 6)}`}>
                  <ProductCard
                    product={product}
                    cartQuantity={cart[product.id] || 0}
                    onAddToCart={handleAddToCart}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </main>

        {/* Cart Sidebar - Desktop */}
        <div className="hidden lg:block w-96 flex-shrink-0">
          {/* Live Delivery Tracker */}
          <div className="sticky top-20 px-4 pt-8">
            <DarkStoreDeliveryTracker
              delivery={activeDelivery}
              isLoading={isLoadingDelivery}
            />
          </div>
          <ShoppingCart
            items={cartItems}
            walletBalance={walletBalance}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            isOpen={true}
            onClose={() => {}}
            isCheckingOut={isCheckingOut}
          />
        </div>
      </div>

      {/* Mobile Cart */}
      <div className="lg:hidden">
        <ShoppingCart
          items={cartItems}
          walletBalance={walletBalance}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          isCheckingOut={isCheckingOut}
        />
      </div>

      {orderDetails && (
        <OrderSuccessModal
          isOpen={orderSuccess}
          onClose={() => { setOrderSuccess(false); setOrderDetails(null); }}
          orderType="darkstore"
          orderId={orderDetails.orderId}
          items={orderDetails.items}
          total={orderDetails.total}
          paymentMethod="razorpay"
          estimatedTime="10-20 min"
          promoCode={orderDetails.promoCode}
          promoDiscount={orderDetails.promoDiscount}
        />
      )}
    </div>
  );
};

export default DarkStoreInteractive;