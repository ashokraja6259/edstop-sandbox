// FILE: src/app/rider-dashboard/components/BatchDeliverySection.tsx

'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

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

interface BatchDeliverySectionProps {
  batches: BatchDeliveryGroup[];
  onStartBatch: (zoneId: string) => void;
  onNavigateBatch: (zoneId: string) => void;
}

const BatchDeliverySection = ({
  batches,
  onStartBatch,
  onNavigateBatch,
}: BatchDeliverySectionProps) => {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  if (batches.length === 0) {
    return (
      <div className="p-8 glass-neon rounded-2xl text-center">
        <div className="w-16 h-16 rounded-full glass flex items-center justify-center mx-auto mb-4 animate-float">
          <Icon name="TruckIcon" size={32} className="text-muted-foreground" />
        </div>
        <p className="font-heading font-semibold text-foreground">No batch deliveries available</p>
        <p className="font-body text-sm text-text-secondary mt-1">Check back soon for optimized routes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batches.map((batch, batchIndex) => {
        const isExpanded = expandedBatch === batch.zoneId;

        return (
          <div
            key={batch.zoneId}
            className={`glass-neon rounded-2xl overflow-hidden card-hover animate-slide-up stagger-${Math.min(batchIndex + 1, 6)}`}
          >
            {/* Batch Header */}
            <div className="p-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/40 border-b border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30 animate-glow-pulse">
                    <Icon name="MapIcon" size={20} variant="solid" className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-gradient-purple">
                      {batch.zoneName}
                    </h3>
                    <span className="font-caption text-xs text-text-secondary">
                      {batch.orders.length} {batch.orders.length === 1 ? 'order' : 'orders'} • {batch.totalDistance}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedBatch(isExpanded ? null : batch.zoneId)}
                  className="flex items-center justify-center w-8 h-8 glass rounded-xl hover:bg-primary/20 transition-all duration-200 press-scale focus-ring"
                  aria-label={isExpanded ? 'Collapse batch details' : 'Expand batch details'}
                >
                  <Icon
                    name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                    size={20}
                    className={`text-primary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl">
                  <Icon name="ClockIcon" size={14} className="text-primary" />
                  <span className="font-caption text-sm text-foreground font-semibold">{batch.estimatedDuration}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl">
                  <Icon name="MapPinIcon" size={14} className="text-pink-400" />
                  <span className="font-caption text-sm text-foreground font-semibold">Optimized Route</span>
                </div>
              </div>
            </div>

            {/* Batch Orders */}
            {isExpanded && (
              <div className="p-4 animate-slide-up-sm">
                <div className="space-y-3 mb-4">
                  {batch.orders.map((order, index) => (
                    <div
                      key={order.orderId}
                      className={`flex items-start gap-3 p-3 glass rounded-xl animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl flex-shrink-0 font-data text-sm font-bold shadow-lg shadow-purple-500/20">
                        {order.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading font-bold text-sm text-foreground">{order.customerName}</span>
                          <span className="font-caption text-xs text-text-secondary">#{order.orderNumber}</span>
                        </div>
                        <p className="font-body text-sm text-text-secondary leading-relaxed mb-1">{order.deliveryAddress}</p>
                        {order.landmark && (
                          <p className="font-caption text-xs text-text-secondary">📍 {order.landmark}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Icon name="ClockIcon" size={12} className="text-success" />
                          <span className="font-caption text-xs text-success font-semibold">ETA: {order.estimatedTime}</span>
                        </div>
                      </div>
                      {index < batch.orders.length - 1 && (
                        <Icon name="ArrowDownIcon" size={16} className="text-primary flex-shrink-0 mt-2 animate-bounce" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => onNavigateBatch(batch.zoneId)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-heading font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 press-scale focus-ring btn-glow"
                  >
                    <Icon name="MapIcon" size={18} variant="solid" />
                    <span>Navigate Route</span>
                  </button>
                  <button
                    onClick={() => onStartBatch(batch.zoneId)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-heading font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 press-scale focus-ring btn-glow"
                  >
                    <Icon name="PlayIcon" size={18} variant="solid" />
                    <span>Start Batch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BatchDeliverySection;