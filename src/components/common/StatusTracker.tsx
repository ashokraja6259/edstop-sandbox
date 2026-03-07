// FILE: src/components/common/StatusTracker.tsx

'use client';

import Icon from '@/components/ui/AppIcon';
import { IconProps } from '@/components/ui/AppIcon';

interface OrderStatus {
  id: string;
  serviceName: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  estimatedTime?: string;
  orderNumber: string;
  icon: IconProps['name'];
}

interface StatusTrackerProps {
  orders: OrderStatus[];
  variant?: 'compact' | 'detailed';
  onOrderClick?: (orderId: string) => void;
}

const StatusTracker = ({ 
  orders, 
  variant = 'compact',
  onOrderClick 
}: StatusTrackerProps) => {
  const getStatusConfig = (status: OrderStatus['status']) => {
    const configs = {
      pending: {
        label: 'Order Placed',
        color: 'text-warning',
        bgColor: 'bg-warning',
        icon: 'ClockIcon' as IconProps['name'],
      },
      confirmed: {
        label: 'Confirmed',
        color: 'text-primary',
        bgColor: 'bg-primary',
        icon: 'CheckCircleIcon' as IconProps['name'],
      },
      preparing: {
        label: 'Preparing',
        color: 'text-accent',
        bgColor: 'bg-accent',
        icon: 'FireIcon' as IconProps['name'],
      },
      'out-for-delivery': {
        label: 'Out for Delivery',
        color: 'text-success',
        bgColor: 'bg-success',
        icon: 'TruckIcon' as IconProps['name'],
      },
      delivered: {
        label: 'Delivered',
        color: 'text-success',
        bgColor: 'bg-success',
        icon: 'CheckBadgeIcon' as IconProps['name'],
      },
      cancelled: {
        label: 'Cancelled',
        color: 'text-destructive',
        bgColor: 'bg-destructive',
        icon: 'XCircleIcon' as IconProps['name'],
      },
    };
    return configs[status];
  };

  if (orders.length === 0) {
    return (
      <div className="p-8 bg-card border border-border rounded-md text-center">
        <Icon name="ShoppingBagIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <p className="font-body text-text-secondary">No active orders</p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-3">
        {orders.map((order) => {
          const statusConfig = getStatusConfig(order.status);
          return (
            <div
              key={order.id}
              className={`
                flex items-center gap-4 p-4 bg-card border border-border rounded-md
                shadow-geometric hover:shadow-geometric-md
                transition-smooth
                ${onOrderClick ? 'cursor-pointer hover-lift press-scale' : ''}
              `}
              onClick={() => onOrderClick?.(order.id)}
            >
              <div className={`flex items-center justify-center w-10 h-10 ${statusConfig.bgColor} rounded-sm shadow-geometric-sm`}>
                <Icon name={order.icon} size={20} variant="solid" className="text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading font-medium text-sm text-foreground">
                    {order.serviceName}
                  </span>
                  <span className="font-caption text-xs text-text-secondary">
                    #{order.orderNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name={statusConfig.icon} size={14} className={statusConfig.color} />
                  <span className={`font-caption text-xs font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  {order.estimatedTime && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-caption text-xs text-text-secondary">
                        {order.estimatedTime}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {onOrderClick && (
                <Icon name="ChevronRightIcon" size={20} className="text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const statusConfig = getStatusConfig(order.status);
        return (
          <div
            key={order.id}
            className={`
              p-6 bg-card border border-border rounded-md
              shadow-geometric hover:shadow-geometric-md
              transition-smooth
              ${onOrderClick ? 'cursor-pointer hover-lift press-scale' : ''}
            `}
            onClick={() => onOrderClick?.(order.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-12 h-12 ${statusConfig.bgColor} rounded-md shadow-geometric-sm`}>
                  <Icon name={order.icon} size={24} variant="solid" className="text-white" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-base text-foreground mb-1">
                    {order.serviceName}
                  </h4>
                  <span className="font-caption text-xs text-text-secondary">
                    Order #{order.orderNumber}
                  </span>
                </div>
              </div>

              {onOrderClick && (
                <Icon name="ChevronRightIcon" size={20} className="text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-sm">
              <Icon name={statusConfig.icon} size={20} className={statusConfig.color} />
              <div className="flex-1">
                <span className={`font-heading font-medium text-sm ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {order.estimatedTime && (
                  <p className="font-caption text-xs text-text-secondary mt-1">
                    Estimated: {order.estimatedTime}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusTracker;