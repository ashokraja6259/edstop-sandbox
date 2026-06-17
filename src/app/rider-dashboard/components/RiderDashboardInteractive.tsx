// FILE: src/app/rider-dashboard/components/RiderDashboardInteractive.tsx

'use client';

import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import OrderCard from './OrderCard';
import EarningsTracker from './EarningsTracker';
import BatchDeliverySection from './BatchDeliverySection';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import {
  useRiderRealtime,
  type RiderBatchGroup,
  type RiderOrder,
  type RiderStats,
} from '@/hooks/useRiderRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { useIsClient } from '@/hooks/useIsClient';
import { supabase } from '@/lib/supabaseClient';

const EMPTY_STATS: RiderStats = {
  dailyDeliveries: 0,
  completedOrders: 0,
  totalEarnings: 0,
  baseIncentive: 0,
  bonusIncentive: 0,
  targetDeliveries: 15,
};

const LiveBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-success font-caption text-xs font-bold">
    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
    LIVE
  </span>
);

const formatItems = (items: RiderOrder['items']) => {
  if (!items.length) return 'Items unavailable';

  return items
    .map((item) => `${item.name} × ${item.quantity}`)
    .join(', ');
};

const AvailableOrderCard = ({
  order,
  onClaim,
  onNavigate,
  onContact,
}: {
  order: RiderOrder;
  onClaim: (orderId: string) => void;
  onNavigate: (address: string) => void;
  onContact: (phone: string) => void;
}) => {
  return (
    <div className="glass-neon rounded-2xl overflow-hidden card-hover animate-slide-up border border-primary/20">
      <div className="p-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/40 border-b border-primary/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-heading font-bold text-base text-gradient-purple">
                #{order.orderNumber}
              </h3>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-200">
                Ready
              </span>
            </div>
            <p className="font-body text-sm text-text-secondary">
              {order.restaurantName}
            </p>
          </div>

          <div className="text-right">
            <p className="font-data text-lg font-bold text-foreground">
              ₹{order.totalAmount.toFixed(2)}
            </p>
            <p className="font-caption text-xs text-text-secondary">
              {order.paymentMethod}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="font-caption text-xs text-text-secondary uppercase tracking-wider mb-1">
            Items
          </p>
          <p className="font-body text-sm text-foreground leading-relaxed">
            {formatItems(order.items)}
          </p>
        </div>

        <div>
          <p className="font-caption text-xs text-text-secondary uppercase tracking-wider mb-1">
            Delivery
          </p>
          <p className="font-body text-sm text-foreground leading-relaxed">
            {order.deliveryAddress}
          </p>
          {order.specialInstructions && (
            <p className="font-caption text-xs text-text-secondary mt-1">
              Note: {order.specialInstructions}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => onClaim(order.orderId)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-heading font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 press-scale focus-ring btn-glow"
          >
            <Icon name="TruckIcon" size={18} variant="solid" />
            <span>Claim Order</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(order.deliveryAddress)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 glass rounded-xl font-heading font-bold text-sm text-foreground hover:bg-primary/15 transition-all duration-300 press-scale focus-ring"
          >
            <Icon name="MapPinIcon" size={18} />
            <span>Navigate</span>
          </button>

          {order.customerPhone && (
            <button
              type="button"
              onClick={() => onContact(order.customerPhone)}
              className="flex items-center justify-center gap-2 px-4 py-3 glass rounded-xl font-heading font-bold text-sm text-foreground hover:bg-primary/15 transition-all duration-300 press-scale focus-ring"
            >
              <Icon name="PhoneIcon" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const RiderDashboardInteractive = () => {
  const isHydrated = useIsClient();
  const [activeTab, setActiveTab] = useState<
    'available' | 'active' | 'batch' | 'completed'
  >('available');

  const [localAvailableOrders, setLocalAvailableOrders] = useState<RiderOrder[]>([]);
  const [localActiveOrders, setLocalActiveOrders] = useState<RiderOrder[]>([]);
  const [localCompletedOrders, setLocalCompletedOrders] = useState<RiderOrder[]>([]);
  const [localBatchDeliveries, setLocalBatchDeliveries] = useState<RiderBatchGroup[]>([]);
  const [localRiderStats, setLocalRiderStats] = useState<RiderStats>(EMPTY_STATS);

  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<'api' | 'network' | 'generic'>(
    'generic'
  );
  const [isActionLoading, setIsActionLoading] = useState(false);

  const {
    retry,
    manualRetry,
    reset,
    isRetrying,
    retryCount,
    nextRetryIn,
    maxRetriesReached,
  } = useRetry({
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: async () => {
      setHasError(false);
      setErrorType('generic');
    },
  });

  const toast = useToast();
  const { user } = useAuth();

  const {
    availableOrders: liveAvailableOrders,
    activeOrders: liveActiveOrders,
    completedOrders: liveCompletedOrders,
    batchDeliveries: liveBatchDeliveries,
    riderStats: liveRiderStats,
    isLoading: isLiveLoading,
  } = useRiderRealtime(user?.id);

  useEffect(() => {
    if (!isLiveLoading) {
      setLocalAvailableOrders(liveAvailableOrders);
      setLocalActiveOrders(liveActiveOrders);
      setLocalCompletedOrders(liveCompletedOrders);
      setLocalBatchDeliveries(liveBatchDeliveries);
      setLocalRiderStats(liveRiderStats);
    }
  }, [
    isLiveLoading,
    liveAvailableOrders,
    liveActiveOrders,
    liveCompletedOrders,
    liveBatchDeliveries,
    liveRiderStats,
  ]);

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retry, reset]);

  const handleStatusUpdate = useCallback(
    async (orderId: string, newStatus: string) => {
      if (isActionLoading) return;

      setIsActionLoading(true);

      try {
        if (newStatus === 'in-transit') {
          const { error } = await supabase.rpc('rider_claim_order', {
            p_order_id: orderId,
          });

          if (error) throw error;

          toast.success('Order claimed', 'Delivery has started successfully');
          setActiveTab('active');
        } else if (newStatus === 'delivered') {
          const { error } = await supabase.rpc('rider_mark_delivered', {
            p_order_id: orderId,
          });

          if (error) throw error;

          toast.success('Order delivered', 'Order marked as delivered');
          setActiveTab('completed');
        } else {
          toast.error('Unsupported action', 'This rider action is not available.');
        }
      } catch (error) {
        console.error('Rider status update failed:', error);

        toast.error(
          'Action failed',
          error instanceof Error ? error.message : 'Please try again.'
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [isActionLoading, toast]
  );

  const handleClaimOrder = useCallback(
    (orderId: string) => {
      void handleStatusUpdate(orderId, 'in-transit');
    },
    [handleStatusUpdate]
  );

  const handleNavigate = (address: string) => {
    if (!isHydrated) return;

    const encodedAddress = encodeURIComponent(address);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
      '_blank'
    );
  };

  const handleContact = (phone: string) => {
    if (!isHydrated || !phone) return;

    window.location.href = `tel:${phone}`;
  };

  const handleStartBatch = (zoneId: string) => {
    console.log('Starting batch delivery for zone:', zoneId);
    toast.info('Batch delivery', 'Batch delivery controls are coming soon.');
  };

  const handleNavigateBatch = (zoneId: string) => {
    if (!isHydrated) return;

    const batch = localBatchDeliveries.find((item) => item.zoneId === zoneId);
    const firstAddress = batch?.orders?.[0]?.deliveryAddress;

    if (!firstAddress) {
      toast.error('Route unavailable', 'No delivery address found for this batch.');
      return;
    }

    handleNavigate(firstAddress);
  };

  const tabs = [
    {
      id: 'available' as const,
      label: 'Available',
      count: localAvailableOrders.length,
      icon: 'InboxStackIcon',
    },
    {
      id: 'active' as const,
      label: 'My Orders',
      count: localActiveOrders.length,
      icon: 'TruckIcon',
    },
    {
      id: 'batch' as const,
      label: 'Batch',
      count: localBatchDeliveries.length,
      icon: 'MapIcon',
    },
    {
      id: 'completed' as const,
      label: 'Completed',
      count: localCompletedOrders.length,
      icon: 'CheckCircleIcon',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 glass-strong border-b border-white/10 sticky top-0">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center shadow-glow-purple">
                <Icon
                  name="TruckIcon"
                  size={24}
                  variant="solid"
                  className="text-white"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-bold text-xl text-foreground">
                    Rider Dashboard
                  </h1>
                  <LiveBadge />
                </div>
                <p className="font-body text-sm text-text-secondary">
                  Claim ready orders, deliver across campus, and track earnings.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="glass rounded-xl px-3 py-2">
                <p className="font-caption text-xs text-text-secondary">
                  Available
                </p>
                <p className="font-data text-lg font-bold text-foreground">
                  {localAvailableOrders.length}
                </p>
              </div>

              <div className="glass rounded-xl px-3 py-2">
                <p className="font-caption text-xs text-text-secondary">
                  Active
                </p>
                <p className="font-data text-lg font-bold text-foreground">
                  {localActiveOrders.length}
                </p>
              </div>

              <div className="glass rounded-xl px-3 py-2">
                <p className="font-caption text-xs text-text-secondary">
                  Delivered
                </p>
                <p className="font-data text-lg font-bold text-foreground">
                  {localCompletedOrders.length}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-heading text-sm font-bold transition-all duration-200 press-scale focus-ring ${
                  activeTab === tab.id
                    ? 'gradient-primary text-white shadow-glow-purple'
                    : 'glass text-text-secondary hover:text-foreground hover:bg-white/10'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-text-secondary'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {hasError ? (
              <ErrorFallback
                type={errorType}
                onRetry={() => {
                  manualRetry(true);
                }}
                isRetrying={isRetrying}
                retryCount={retryCount}
                nextRetryIn={nextRetryIn}
                maxRetriesReached={maxRetriesReached}
                autoRetryEnabled={true}
              />
            ) : (
              <>
                {activeTab === 'available' && (
                  <>
                    {isLiveLoading ? (
                      <div className="space-y-4">
                        {[...Array(2)].map((_, index) => (
                          <div
                            key={index}
                            className="glass-neon rounded-2xl p-5 space-y-4 animate-pulse"
                          >
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
                    ) : localAvailableOrders.length === 0 ? (
                      <EmptyState
                        icon="🎉"
                        title="No ready orders"
                        description="Orders marked ready by vendors will appear here for riders to claim."
                      />
                    ) : (
                      localAvailableOrders.map((order) => (
                        <AvailableOrderCard
                          key={order.orderId}
                          order={order}
                          onClaim={handleClaimOrder}
                          onNavigate={handleNavigate}
                          onContact={handleContact}
                        />
                      ))
                    )}
                  </>
                )}

                {activeTab === 'active' && (
                  <>
                    {isLiveLoading ? (
                      <div className="space-y-4">
                        {[...Array(2)].map((_, index) => (
                          <div
                            key={index}
                            className="glass-neon rounded-2xl p-5 space-y-4 animate-pulse"
                          >
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
                    ) : localActiveOrders.length === 0 ? (
                      <EmptyState
                        icon="🚴"
                        title="No active deliveries"
                        description="Claim a ready order to start a delivery."
                      />
                    ) : (
                      localActiveOrders.map((order) => (
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

                {activeTab === 'batch' &&
                  (isLiveLoading ? (
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
                  ))}

                {activeTab === 'completed' &&
                  (isLiveLoading ? (
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
                  ))}
              </>
            )}
          </div>

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
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="flex justify-between">
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

      {isActionLoading && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
          Updating order...
        </div>
      )}
    </div>
  );
};

export default RiderDashboardInteractive;