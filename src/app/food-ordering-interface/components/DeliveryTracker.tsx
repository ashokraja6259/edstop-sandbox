// FILE: src/app/food-ordering-interface/components/DeliveryTracker.tsx

'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { DeliveryUpdate } from '@/hooks/useDeliveryTracking';
import { DELIVERY_STATUS_CONFIG, DARK_STORE_STEPS } from '@/hooks/useDeliveryTracking';

interface DeliveryTrackerProps {
  delivery: DeliveryUpdate;
  onDismiss?: () => void;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:          'text-text-secondary',
  confirmed:        'text-success',
  preparing:        'text-warning',
  ready:            'text-info',
  out_for_delivery: 'text-primary',
  delivered:        'text-success',
  cancelled:        'text-destructive',
};

const STATUS_BG: Record<string, string> = {
  pending:          'bg-muted',
  confirmed:        'bg-success/10 border-success/30',
  preparing:        'bg-warning/10 border-warning/30',
  ready:            'bg-info/10 border-info/30',
  out_for_delivery: 'bg-primary/10 border-primary/30',
  delivered:        'bg-success/10 border-success/30',
  cancelled:        'bg-destructive/10 border-destructive/30',
};

const DeliveryTracker = ({ delivery, onDismiss, className = '' }: DeliveryTrackerProps) => {
  const [pulse, setPulse] = useState(false);

  // Pulse animation on status change
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(t);
  }, [delivery.status]);

  const config = DELIVERY_STATUS_CONFIG[delivery.status];
  const currentStep = config?.step ?? 0;
  const isCancelled = delivery.status === 'cancelled';
  const isDelivered = delivery.status === 'delivered';
  const isActive = !isCancelled && !isDelivered;

  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  return (
    <div
      className={`bg-card border rounded-md shadow-geometric overflow-hidden transition-all duration-300 ${
        STATUS_BG[delivery.status] ?? 'border-border'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config?.icon ?? '📋'}</span>
          <div>
            <p className="font-heading font-semibold text-sm text-foreground">
              Order #{delivery.orderNumber}
            </p>
            {delivery.restaurantName && (
              <p className="font-caption text-xs text-text-secondary">{delivery.restaurantName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live badge */}
          {isActive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full bg-primary ${pulse ? 'animate-ping' : 'animate-pulse'}`} />
              <span className="font-caption text-xs text-primary font-medium">LIVE</span>
            </span>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-muted transition-smooth"
              aria-label="Dismiss tracker"
            >
              <Icon name="XMarkIcon" size={14} className="text-text-secondary" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
              isCancelled ? 'bg-destructive/10' : isDelivered ? 'bg-success/10' : 'bg-primary/10'
            }`}
          >
            {config?.icon ?? '📋'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-heading font-semibold text-sm ${STATUS_COLORS[delivery.status] ?? 'text-foreground'}`}>
              {config?.label ?? delivery.status}
            </p>
            <p className="font-caption text-xs text-text-secondary truncate">
              {config?.description}
            </p>
          </div>
          {/* ETA */}
          {delivery.etaMinutes !== null && isActive && (
            <div className="flex-shrink-0 text-right">
              <p className="font-data font-bold text-lg text-primary leading-none">
                {delivery.etaMinutes}
              </p>
              <p className="font-caption text-xs text-text-secondary">min</p>
            </div>
          )}
          {delivery.estimatedDeliveryTime && isActive && delivery.etaMinutes === 0 && (
            <div className="flex-shrink-0 text-right">
              <p className="font-caption text-xs text-success font-medium">Arriving now</p>
            </div>
          )}
        </div>

        {/* Progress DARK_STORE_STEPS (not shown for cancelled) */}
        {!isCancelled && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              {DARK_STORE_STEPS.map((step, idx) => {
                const stepConfig = DELIVERY_STATUS_CONFIG[step];
                const stepNum = stepConfig?.step ?? 0;
                const isDone = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;
                return (
                  <div key={step} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full h-1.5 rounded-full transition-all duration-500 ${
                        isDone
                          ? 'bg-success'
                          : isCurrent
                          ? 'bg-primary' :'bg-muted'
                      }`}
                    />
                    <span
                      className={`text-xs transition-all duration-300 ${
                        isDone ? 'opacity-60' : isCurrent ? 'opacity-100' : 'opacity-30'
                      }`}
                    >
                      {stepConfig?.icon}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-caption text-xs text-text-secondary">Placed</span>
              <span className="font-caption text-xs text-text-secondary">Delivered</span>
            </div>
          </div>
        )}

        {/* ETA row */}
        {delivery.estimatedDeliveryTime && isActive && (
          <div className="flex items-center gap-2 p-2.5 bg-muted rounded-sm">
            <Icon name="ClockIcon" size={14} className="text-primary flex-shrink-0" />
            <div className="flex-1">
              <span className="font-caption text-xs text-text-secondary">Estimated arrival: </span>
              <span className="font-data text-xs font-medium text-foreground">
                {formatTime(delivery.estimatedDeliveryTime)}
              </span>
            </div>
            {delivery.etaMinutes !== null && (
              <span className="font-caption text-xs text-primary font-medium">
                ~{delivery.etaMinutes} min away
              </span>
            )}
          </div>
        )}

        {/* Rider info */}
        {delivery.riderName && (
          <div className="flex items-center gap-3 p-2.5 bg-muted rounded-sm">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name="UserCircleIcon" size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-medium text-sm text-foreground truncate">
                {delivery.riderName}
              </p>
              <p className="font-caption text-xs text-text-secondary">Your delivery rider</p>
            </div>
            {delivery.riderPhone && (
              <a
                href={`tel:${delivery.riderPhone}`}
                className="w-8 h-8 flex items-center justify-center rounded-sm bg-primary/10 hover:bg-primary/20 transition-smooth"
                aria-label="Call rider"
              >
                <Icon name="PhoneIcon" size={14} className="text-primary" />
              </a>
            )}
          </div>
        )}

        {/* Rider location */}
        {delivery.riderLocation && delivery.status === 'out_for_delivery' && (
          <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-sm">
            <span className="text-sm">📍</span>
            <div className="flex-1">
              <p className="font-caption text-xs text-primary font-medium">Rider location updated</p>
              <p className="font-caption text-xs text-text-secondary">
                Last updated {new Date(delivery.riderLocation.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}

        {/* Delivered message */}
        {isDelivered && (
          <div className="flex items-center gap-2 p-2.5 bg-success/10 border border-success/30 rounded-sm">
            <span className="text-sm">🎉</span>
            <p className="font-caption text-xs text-success font-medium">
              Order delivered! Enjoy your meal.
            </p>
          </div>
        )}

        {/* Cancelled message */}
        {isCancelled && (
          <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-sm">
            <Icon name="ExclamationCircleIcon" size={14} className="text-destructive flex-shrink-0" />
            <p className="font-caption text-xs text-destructive">
              This order was cancelled. Any charges will be refunded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryTracker;
