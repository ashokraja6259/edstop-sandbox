// FILE: src/app/rider-dashboard/components/RiderDashboardInteractive.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import OrderCard from './OrderCard';
import EarningsTracker from './EarningsTracker';
import BatchDeliverySection from './BatchDeliverySection';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useRiderRealtime } from '@/hooks/useRiderRealtime';
import { useAuth } from '@/contexts/AuthContext';


interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  landmark: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'COD' | 'ONLINE';
  codAmount?: number;
  status: 'pending-pickup' | 'in-transit' | 'delivered';
  estimatedTime: string;
  specialInstructions?: string;
  restaurantName: string;
  restaurantAddress: string;
  pickupTime?: string;
}

interface BatchOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  landmark: string;
  estimatedTime: string;
  sequence: number;
}

interface BatchDeliveryGroup {
  zoneId: string;
  zoneName: string;
  orders: BatchOrder[];
  totalDistance: string;
  estimatedDuration: string;
}

// ── Mock fallback data ────────────────────────────────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    orderId: '1',
    orderNumber: 'FD2024021501',
    customerName: 'Rahul Sharma',
    customerPhone: '+91 98765 43210',
    deliveryAddress: 'Room 204, Nehru Hall, IIT Kharagpur',
    landmark: 'Near Main Gate',
    items: [
      { id: '1', name: 'Chicken Biryani', quantity: 1, price: 180 },
      { id: '2', name: 'Raita', quantity: 1, price: 40 },
      { id: '3', name: 'Gulab Jamun', quantity: 2, price: 60 },
    ],
    totalAmount: 280,
    paymentMethod: 'COD',
    codAmount: 280,
    status: 'pending-pickup',
    estimatedTime: '25 mins',
    specialInstructions: 'Please call before arriving. Extra spicy biryani requested.',
    restaurantName: 'Biryani House',
    restaurantAddress: 'Technology Market, IIT Kharagpur',
    pickupTime: '6:45 PM',
  },
  {
    orderId: '2',
    orderNumber: 'FD2024021502',
    customerName: 'Priya Patel',
    customerPhone: '+91 87654 32109',
    deliveryAddress: 'B-Wing, LBS Hall, IIT Kharagpur',
    landmark: 'Behind Library',
    items: [
      { id: '4', name: 'Paneer Butter Masala', quantity: 1, price: 160 },
      { id: '5', name: 'Butter Naan', quantity: 3, price: 45 },
      { id: '6', name: 'Dal Tadka', quantity: 1, price: 120 },
    ],
    totalAmount: 325,
    paymentMethod: 'ONLINE',
    status: 'in-transit',
    estimatedTime: '15 mins',
    restaurantName: 'Punjabi Dhaba',
    restaurantAddress: 'Main Market, IIT Kharagpur',
    pickupTime: '6:30 PM',
  },
  {
    orderId: '3',
    orderNumber: 'FD2024021503',
    customerName: 'Amit Kumar',
    customerPhone: '+91 76543 21098',
    deliveryAddress: 'Room 312, Patel Hall, IIT Kharagpur',
    landmark: 'Near Sports Complex',
    items: [
      { id: '7', name: 'Veg Fried Rice', quantity: 1, price: 140 },
      { id: '8', name: 'Chilli Paneer', quantity: 1, price: 180 },
      { id: '9', name: 'Spring Rolls', quantity: 1, price: 100 },
    ],
    totalAmount: 420,
    paymentMethod: 'COD',
    codAmount: 420,
    status: 'pending-pickup',
    estimatedTime: '30 mins',
    specialInstructions: 'No onions in fried rice',
    restaurantName: 'Chinese Corner',
    restaurantAddress: 'Technology Market, IIT Kharagpur',
    pickupTime: '6:50 PM',
  },
];

const MOCK_COMPLETED: Order[] = [
  {
    orderId: '4',
    orderNumber: 'FD2024021498',
    customerName: 'Sneha Reddy',
    customerPhone: '+91 65432 10987',
    deliveryAddress: 'Room 105, Azad Hall, IIT Kharagpur',
    landmark: 'Near Main Road',
    items: [
      { id: '10', name: 'Masala Dosa', quantity: 2, price: 120 },
      { id: '11', name: 'Filter Coffee', quantity: 2, price: 60 },
    ],
    totalAmount: 180,
    paymentMethod: 'ONLINE',
    status: 'delivered',
    estimatedTime: 'Delivered',
    restaurantName: 'South Indian Cafe',
    restaurantAddress: 'Main Market, IIT Kharagpur',
  },
];

const MOCK_BATCHES: BatchDeliveryGroup[] = [
  {
    zoneId: 'zone1',
    zoneName: 'Nehru Hall Zone',
    totalDistance: '1.2 km',
    estimatedDuration: '18 mins',
    orders: [
      {
        orderId: '6',
        orderNumber: 'FD2024021504',
        customerName: 'Ananya Gupta',
        deliveryAddress: 'Room 301, Nehru Hall',
        landmark: 'Third Floor',
        estimatedTime: '20 mins',
        sequence: 1,
      },
      {
        orderId: '7',
        orderNumber: 'FD2024021505',
        customerName: 'Rohan Mehta',
        deliveryAddress: 'Room 215, Nehru Hall',
        landmark: 'Second Floor',
        estimatedTime: '23 mins',
        sequence: 2,
      },
    ],
  },
];

const MOCK_STATS = {
  dailyDeliveries: 12,
  completedOrders: 12,
  totalEarnings: 840,
  baseIncentive: 600,
  bonusIncentive: 240,
  targetDeliveries: 15,
};

// ── Live badge component ──────────────────────────────────────────────────────
const LiveBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-success font-caption text-xs font-bold">
    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
    LIVE
  </span>
);

const RiderDashboardInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'batch' | 'completed'>('active');

  // Local state for optimistic UI updates (status changes made by rider)
  const [localActiveOrders, setLocalActiveOrders] = useState<Order[]>([]);
  const [localCompletedOrders, setLocalCompletedOrders] = useState<Order[]>([]);
  const [localBatchDeliveries, setLocalBatchDeliveries] = useState<BatchDeliveryGroup[]>([]);
  const [localRiderStats, setLocalRiderStats] = useState(MOCK_STATS);
  const [useLiveData, setUseLiveData] = useState(false);

  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<'api' | 'network' | 'generic'>('generic');

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

  // ── Supabase real-time hook ───────────────────────────────────────────────
  const {
    activeOrders: liveActiveOrders,
    completedOrders: liveCompletedOrders,
    batchDeliveries: liveBatchDeliveries,
    riderStats: liveRiderStats,
    isLoading: isLiveLoading,
  } = useRiderRealtime(user?.id);

  // ── Sync live data into local state once loaded ─────────────────────────────
  useEffect(() => {
    if (!isLiveLoading) {
      const hasLiveData =
        liveActiveOrders.length > 0 ||
        liveCompletedOrders.length > 0;

      if (hasLiveData) {
        setLocalActiveOrders(liveActiveOrders as Order[]);
        setLocalCompletedOrders(liveCompletedOrders as Order[]);
        setLocalBatchDeliveries(liveBatchDeliveries as BatchDeliveryGroup[]);
        setLocalRiderStats(liveRiderStats);
        setUseLiveData(true);
      } else {
        // Fall back to mock data when no DB records exist
        setLocalActiveOrders(MOCK_ORDERS);
        setLocalCompletedOrders(MOCK_COMPLETED);
        setLocalBatchDeliveries(MOCK_BATCHES);
        setLocalRiderStats(MOCK_STATS);
        setUseLiveData(false);
      }
    }
  }, [isLiveLoading, liveActiveOrders, liveCompletedOrders, liveBatchDeliveries, liveRiderStats]);

  // ── Keep local state in sync with live updates after initial load ─────────
  useEffect(() => {
    if (useLiveData && !isLiveLoading) {
      setLocalActiveOrders(liveActiveOrders as Order[]);
      setLocalCompletedOrders(liveCompletedOrders as Order[]);
      setLocalBatchDeliveries(liveBatchDeliveries as BatchDeliveryGroup[]);
      setLocalRiderStats(liveRiderStats);
    }
  }, [useLiveData, isLiveLoading, liveActiveOrders, liveCompletedOrders, liveBatchDeliveries, liveRiderStats]);

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

  const handleStatusUpdate = useCallback((orderId: string, newStatus: string) => {
    setLocalActiveOrders((prevOrders) => {
      const updatedOrders = prevOrders.map((order) =>
        order.orderId === orderId
          ? { ...order, status: newStatus as Order['status'] }
          : order
      );
      if (newStatus === 'delivered') {
        const deliveredOrder = updatedOrders.find(o => o.orderId === orderId);
        if (deliveredOrder) {
          setLocalCompletedOrders(prev => {
            const updated = [{ ...deliveredOrder, status: 'delivered' as const }, ...prev];
            // Recalculate earnings
            const base = updated.length * 50;
            const bonus = updated.length >= 15 ? 200 : 0;
            setLocalRiderStats({
              dailyDeliveries: updated.length,
              completedOrders: updated.length,
              totalEarnings: base + bonus,
              baseIncentive: base,
              bonusIncentive: bonus,
              targetDeliveries: 15,
            });
            return updated;
          });
          toast.success('Order delivered!', `Order #${deliveredOrder.orderNumber} marked as delivered`);
        }
        return updatedOrders.filter(o => o.orderId !== orderId);
      }
      if (newStatus === 'in-transit') {
        toast.info('Order picked up', `Order #${orderId} is now in transit`);
      }
      return updatedOrders;
    });
  }, [toast]);

  const handleNavigate = (address: string) => {
    if (!isHydrated) return;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const handleContact = (phone: string) => {
    if (!isHydrated) return;
    window.location.href = `tel:${phone}`;
  };

  const handleStartBatch = (zoneId: string) => {
    console.log('Starting batch delivery for zone:', zoneId);
  };

  const handleNavigateBatch = (zoneId: string) => {
    if (!isHydrated) return;
    const batch = localBatchDeliveries.find((b) => b.zoneId === zoneId);
    if (batch && batch.orders.length > 0) {
      const firstAddress = batch.orders[0].deliveryAddress;
      handleNavigate(firstAddress);
    }
  };

  const handleLogout = () => {
    if (!isHydrated) return;
    if (window.confirm('Are you sure you want to logout?')) {
      window.location.href = '/';
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton Header */}
        <div className="glass-header h-16 flex items-center px-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-32 h-4 rounded-lg bg-primary/20 animate-pulse" />
              <div className="w-40 h-3 rounded-lg bg-primary/10 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-8 rounded-xl bg-primary/15 animate-pulse" />
            <div className="w-24 h-8 rounded-xl bg-primary/15 animate-pulse" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-neon rounded-2xl p-4 text-center space-y-2" style={{animationDelay: `${i * 0.07}s`}}>
                <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse mx-auto" />
                <div className="w-16 h-6 rounded-lg bg-primary/20 animate-pulse mx-auto" />
                <div className="w-20 h-3 rounded-lg bg-primary/10 animate-pulse mx-auto" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 p-1 glass-neon rounded-2xl">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 h-10 rounded-xl bg-primary/15 animate-pulse" style={{animationDelay: `${i * 0.06}s`}} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-neon rounded-2xl p-5 space-y-4" style={{animationDelay: `${i * 0.1}s`}}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="w-36 h-5 rounded-lg bg-primary/20 animate-pulse" />
                      <div className="w-24 h-3 rounded-lg bg-primary/10 animate-pulse" />
                    </div>
                    <div className="w-24 h-7 rounded-full bg-primary/15 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-4 rounded-lg bg-primary/10 animate-pulse" />
                    <div className="w-3/4 h-4 rounded-lg bg-primary/10 animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 h-10 rounded-xl bg-primary/15 animate-pulse" />
                    <div className="flex-1 h-10 rounded-xl bg-primary/15 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="glass-neon rounded-2xl p-5 space-y-4 h-fit">
              <div className="w-32 h-5 rounded-lg bg-primary/20 animate-pulse" />
              <div className="w-full h-3 rounded-full bg-primary/15 animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between" style={{animationDelay: `${i * 0.07}s`}}>
                  <div className="w-28 h-4 rounded-lg bg-primary/10 animate-pulse" />
                  <div className="w-16 h-4 rounded-lg bg-primary/15 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-purple-600/8 blur-3xl animate-orb-float" />
        <div className="absolute bottom-40 right-10 w-80 h-80 rounded-full bg-emerald-600/8 blur-3xl animate-orb-float" style={{animationDelay: '3s'}} />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full bg-indigo-600/6 blur-3xl animate-orb-float" style={{animationDelay: '6s'}} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30 animate-glow-pulse">
                <Icon name="TruckIcon" size={22} variant="solid" className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-bold text-lg text-gradient-purple">Rider Dashboard</h1>
                  {useLiveData && <LiveBadge />}
                </div>
                <p className="font-caption text-xs text-text-secondary">IIT KGP Campus Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 glass-green rounded-xl">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                <span className="font-caption text-xs font-bold text-success">Online</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 glass-neon rounded-xl">
                <Icon name="CurrencyRupeeIcon" size={14} className="text-primary" />
                <span className="font-data font-bold text-sm text-gradient-purple">
                  {isLiveLoading ? (
                    <span className="inline-block w-12 h-4 rounded bg-primary/20 animate-pulse" />
                  ) : (
                    `₹${localRiderStats.totalEarnings}`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Hero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Deliveries', value: isLiveLoading ? '...' : String(localRiderStats.dailyDeliveries), icon: '🚴', color: 'from-purple-600 to-indigo-600', delay: '0s' },
            { label: 'Earnings', value: isLiveLoading ? '...' : `₹${localRiderStats.totalEarnings}`, icon: '💰', color: 'from-emerald-600 to-teal-600', delay: '0.05s' },
            { label: 'Target', value: isLiveLoading ? '...' : `${localRiderStats.dailyDeliveries}/${localRiderStats.targetDeliveries}`, icon: '🎯', color: 'from-pink-600 to-rose-600', delay: '0.1s' },
            { label: 'Bonus', value: isLiveLoading ? '...' : `₹${localRiderStats.bonusIncentive}`, icon: '⭐', color: 'from-amber-500 to-yellow-500', delay: '0.15s' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-neon rounded-2xl p-4 text-center card-hover animate-slide-up"
              style={{animationDelay: stat.delay}}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <div className="font-data text-xl font-bold text-foreground">{stat.value}</div>
              <div className="font-caption text-xs text-text-secondary mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 glass-neon rounded-2xl">
          {(['active', 'batch', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 py-2.5 px-4 rounded-xl font-heading font-bold text-sm capitalize
                transition-all duration-300 press-scale
                ${activeTab === tab
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-text-secondary hover:text-foreground hover:bg-primary/10'
                }
              `}
            >
              {tab === 'active' ? `🚴 Active (${localActiveOrders.filter(o => o.status !== 'delivered').length})` :
               tab === 'batch' ? `📦 Batch (${localBatchDeliveries.length})` :
               `✅ Done (${localCompletedOrders.length})`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {hasError ? (
              <ErrorFallback
                type={errorType}
                onRetry={() => { manualRetry(true); }}
                isRetrying={isRetrying}
                retryCount={retryCount}
                nextRetryIn={nextRetryIn}
                maxRetriesReached={maxRetriesReached}
                autoRetryEnabled={true}
              />
            ) : (
              <>
                {activeTab === 'active' && (
                  <>
                    {isLiveLoading ? (
                      <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="glass-neon rounded-2xl p-5 space-y-4 animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/20" />
                              <div className="space-y-1.5">
                                <div className="w-36 h-4 rounded-lg bg-primary/20" />
                                <div className="w-24 h-3 rounded-lg bg-primary/10" />
                              </div>
                            </div>
                            <div className="w-full h-3 rounded-lg bg-primary/10" />
                            <div className="flex gap-3">
                              <div className="flex-1 h-10 rounded-xl bg-primary/15" />
                              <div className="flex-1 h-10 rounded-xl bg-primary/15" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : localActiveOrders.filter(o => o.status !== 'delivered').length === 0 ? (
                      <EmptyState
                        icon="🎉"
                        title="All caught up!"
                        description="No active orders right now. New orders will appear here automatically."
                      />
                    ) : (
                      localActiveOrders
                        .filter(o => o.status !== 'delivered')
                        .map((order) => (
                          <OrderCard
                            key={order.orderId}
                            {...order}
                            onStatusUpdate={handleStatusUpdate}
                            onNavigate={handleNavigate}
                            onContact={handleContact}
                          />
                        ))
                    )}
                  </>
                )}

                {activeTab === 'batch' && (
                  isLiveLoading ? (
                    <div className="glass-neon rounded-2xl p-5 space-y-3 animate-pulse">
                      <div className="w-40 h-5 rounded-lg bg-primary/20" />
                      <div className="w-full h-3 rounded-lg bg-primary/10" />
                    </div>
                  ) : localBatchDeliveries.length === 0 ? (
                    <EmptyState
                      icon="📦"
                      title="No batch deliveries"
                      description="Batch delivery groups will appear here when multiple orders share the same zone."
                    />
                  ) : (
                    <BatchDeliverySection
                      batches={localBatchDeliveries}
                      onStartBatch={handleStartBatch}
                      onNavigateBatch={handleNavigateBatch}
                    />
                  )
                )}

                {activeTab === 'completed' && (
                  isLiveLoading ? (
                    <div className="glass-neon rounded-2xl p-5 space-y-3 animate-pulse">
                      <div className="w-40 h-5 rounded-lg bg-primary/20" />
                      <div className="w-full h-3 rounded-lg bg-primary/10" />
                    </div>
                  ) : localCompletedOrders.length === 0 ? (
                    <EmptyState
                      icon="📦"
                      title="No completed orders yet"
                      description="Start delivering to see your completed order history here."
                    />
                  ) : (
                    localCompletedOrders.map((order) => (
                      <OrderCard
                        key={order.orderId}
                        {...order}
                        onStatusUpdate={handleStatusUpdate}
                        onNavigate={handleNavigate}
                        onContact={handleContact}
                      />
                    ))
                  )
                )}
              </>
            )}
          </div>

          {/* Earnings Sidebar */}
          <div className="space-y-6">
            {isLiveLoading ? (
              <div className="glass-green rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/20" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3 rounded-lg bg-success/20" />
                    <div className="w-20 h-6 rounded-lg bg-success/30" />
                  </div>
                </div>
                <div className="w-full h-3 rounded-full bg-success/15" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="w-24 h-4 rounded-lg bg-success/10" />
                    <div className="w-16 h-4 rounded-lg bg-success/15" />
                  </div>
                ))}
              </div>
            ) : (
              <EarningsTracker
                dailyDeliveries={localRiderStats.dailyDeliveries}
                completedOrders={localRiderStats.completedOrders}
                totalEarnings={localRiderStats.totalEarnings}
                baseIncentive={localRiderStats.baseIncentive}
                bonusIncentive={localRiderStats.bonusIncentive}
                targetDeliveries={localRiderStats.targetDeliveries}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RiderDashboardInteractive;