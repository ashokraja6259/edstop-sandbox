// FILE: src/app/student-dashboard/components/ActiveOrdersSection.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import ErrorFallback from '@/components/ui/ErrorFallback';

interface OrderStatus {
  id: string;
  serviceName: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  estimatedTime?: string;
  orderNumber: string;
  icon: 'ShoppingBagIcon' | 'ShoppingCartIcon';
}

interface ActiveOrdersSectionProps {
  orders: OrderStatus[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; emoji: string; step: number }> = {
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', emoji: '⏳', step: 0 },
  confirmed: { label: 'Confirmed', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', emoji: '✅', step: 1 },
  preparing: { label: 'Preparing', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', emoji: '👨‍🍳', step: 2 },
  'out-for-delivery': { label: 'On the way', color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', emoji: '🛵', step: 3 },
  delivered: { label: 'Delivered', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', emoji: '🎉', step: 4 },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', emoji: '❌', step: -1 },
};

const steps = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered'];

const ActiveOrdersSection = ({ orders, isLoading = false, hasError = false, onRetry }: ActiveOrdersSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-24 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="animate-pulse h-6 bg-white/10 rounded w-32"></div>
          <div className="animate-pulse h-6 bg-white/10 rounded-full w-20"></div>
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="glass rounded-2xl p-4 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="animate-pulse w-10 h-10 bg-white/10 rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="animate-pulse h-4 bg-white/10 rounded w-28"></div>
                    <div className="animate-pulse h-3 bg-white/5 rounded w-20"></div>
                  </div>
                </div>
                <div className="animate-pulse h-6 bg-white/10 rounded-full w-24"></div>
              </div>
              <div className="animate-pulse flex gap-1 mb-3">
                {[1,2,3,4,5].map(j => <div key={j} className="flex-1 h-1.5 bg-white/10 rounded-full"></div>)}
              </div>
              <div className="animate-pulse h-3 bg-white/5 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-xl text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-600 rounded-full inline-block"></span>
            Active Orders
          </h2>
        </div>
        <ErrorFallback
          type="api"
          title="Couldn't load active orders"
          description="Live order tracking is temporarily unavailable."
          onRetry={onRetry}
          variant="minimal"
        />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-xl text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-600 rounded-full inline-block"></span>
          Active Orders
        </h2>
        {orders.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-orange-300 font-semibold">{orders.length} live</span>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="text-white/50 text-sm">No active orders right now</p>
          <p className="text-white/30 text-xs mt-1">Order something delicious!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const currentStep = config.step;
            return (
              <div
                key={order.id}
                className="glass rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-smooth"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-lg">
                      🍔
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{order.serviceName}</p>
                      <p className="text-xs text-white/40 font-mono">{order.orderNumber}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 ${config.bg} rounded-full border ${config.border}`}>
                    <span className="text-sm">{config.emoji}</span>
                    <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                  </div>
                </div>

                {/* Progress steps */}
                <div className="flex items-center gap-1 mb-3">
                  {steps.map((step, i) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`w-full h-1.5 rounded-full transition-all duration-500 ${
                        i <= currentStep
                          ? 'bg-gradient-to-r from-orange-500 to-red-500' :'bg-white/10'
                      }`}></div>
                    </div>
                  ))}
                </div>

                {order.estimatedTime && (
                  <div className="flex items-center gap-2">
                    <Icon name="ClockIcon" size={14} className="text-white/40" />
                    <span className="text-xs text-white/60">ETA: <span className="text-white font-semibold">{order.estimatedTime}</span></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActiveOrdersSection;