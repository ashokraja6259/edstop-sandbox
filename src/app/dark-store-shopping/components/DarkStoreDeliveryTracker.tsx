// FILE: src/app/dark-store-shopping/components/DarkStoreDeliveryTracker.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { DarkStoreDelivery, DarkStoreOrderStatus } from '@/hooks/useDarkStoreRealtime';
import { DELIVERY_STATUS_CONFIG, DARK_STORE_STEPS } from '@/hooks/useDarkStoreRealtime';

interface DarkStoreDeliveryTrackerProps {
  delivery: DarkStoreDelivery | null;
  isLoading: boolean;
}

const STEP_LABELS: Record<DarkStoreOrderStatus, string> = {
  pending:          'Placed',
  confirmed:        'Confirmed',
  preparing:        'Packing',
  ready:            'Ready',
  out_for_delivery: 'On the Way',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
};

const DarkStoreDeliveryTracker = ({ delivery, isLoading }: DarkStoreDeliveryTrackerProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (delivery?.status === 'delivered') {
      const timer = setTimeout(() => setIsExpanded(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [delivery?.status]);

  if (isLoading) {
    return (
      <div className="glass-neon rounded-2xl p-4 mb-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20" />
          <div className="flex-1">
            <div className="h-4 bg-primary/20 rounded-lg w-32 mb-1" />
            <div className="h-3 bg-primary/10 rounded-lg w-24" />
          </div>
        </div>
        <div className="h-2 bg-primary/15 rounded-full" />
      </div>
    );
  }

  if (!delivery || delivery.status === 'delivered' || delivery.status === 'cancelled') {
    if (!delivery) return null;
    if (delivery.status === 'cancelled') {
      return (
        <div className="glass-neon rounded-2xl p-4 mb-4 border border-destructive/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-destructive/20 flex items-center justify-center">
              <span className="text-sm">❌</span>
            </div>
            <div>
              <p className="font-heading font-semibold text-sm text-destructive">Order Cancelled</p>
              <p className="font-caption text-xs text-text-secondary">Order #{delivery.orderNumber}</p>
            </div>
          </div>
        </div>
      );
    }
    if (delivery.status === 'delivered') {
      return (
        <div className="glass-neon rounded-2xl p-4 mb-4 border border-success/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-success/20 flex items-center justify-center">
              <span className="text-sm">🎉</span>
            </div>
            <div>
              <p className="font-heading font-semibold text-sm text-success">Order Delivered!</p>
              <p className="font-caption text-xs text-text-secondary">Order #{delivery.orderNumber} — Enjoy your items!</p>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!delivery) return null;

  const config = DELIVERY_STATUS_CONFIG[delivery.status];
  const currentStepIndex = DARK_STORE_STEPS.indexOf(delivery.status);
  const progressPercent = currentStepIndex >= 0
    ? Math.round((currentStepIndex / (DARK_STORE_STEPS.length - 1)) * 100)
    : 0;

  return (
    <div className="glass-neon rounded-2xl overflow-hidden mb-4 border border-primary/20 animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 flex items-center justify-center">
            <span className="text-sm">{config.icon}</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="font-heading font-semibold text-sm text-foreground">{config.label}</p>
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block"></span>
                <span className="font-caption text-xs text-primary font-bold">LIVE</span>
              </span>
            </div>
            <p className="font-caption text-xs text-text-secondary">Order #{delivery.orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {delivery.etaMinutes !== null &&
 delivery.status === 'out_for_delivery' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-success/20 rounded-lg">
              <Icon name="ClockIcon" size={12} className="text-success" />
              <span className="font-data text-xs font-bold text-success">{delivery.etaMinutes} min</span>
            </div>
          )}
          <Icon
            name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
            size={16}
            className="text-text-secondary"
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Progress bar */}
          <div className="relative mb-4">
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-start justify-between gap-1">
            {DARK_STORE_STEPS.map((step, index) => {
              const stepConfig = DELIVERY_STATUS_CONFIG[step];
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isFuture = index > currentStepIndex;

              return (
                <div key={step} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-300
                      ${isCompleted ? 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-sm shadow-purple-500/40' : ''}
                      ${isCurrent ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-md shadow-purple-500/50 ring-2 ring-purple-400/50 animate-pulse' : ''}
                      ${isFuture ? 'bg-muted/30' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <Icon name="CheckIcon" size={12} className="text-white" />
                    ) : (
                      <span className={isCurrent ? 'text-white' : 'text-muted-foreground'}>
                        {stepConfig.icon}
                      </span>
                    )}
                  </div>
                  <span
                    className={`
                      font-caption text-center leading-tight
                      ${isCurrent ? 'text-primary font-bold text-[9px]' : 'text-text-secondary text-[9px]'}
                      ${isFuture ? 'opacity-40' : ''}
                    `}
                    style={{ fontSize: '9px' }}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Status description */}
          <div className="mt-3 px-3 py-2 bg-primary/10 rounded-xl">
            <p className="font-caption text-xs text-text-secondary text-center">
              {config.description}
              {delivery.etaMinutes !== null &&
 delivery.status === 'out_for_delivery' && (
                <span className="text-primary font-bold"> · {delivery.etaMinutes} min away</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DarkStoreDeliveryTracker;
