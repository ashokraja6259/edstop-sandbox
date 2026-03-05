// FILE: src/app/rider-dashboard/components/OrderCard.tsx

'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';


interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderCardProps {
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
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onNavigate: (address: string) => void;
  onContact: (phone: string) => void;
}

const OrderCard = ({
  orderId,
  orderNumber,
  customerName,
  customerPhone,
  deliveryAddress,
  landmark,
  items,
  totalAmount,
  paymentMethod,
  codAmount,
  status,
  estimatedTime,
  specialInstructions,
  restaurantName,
  restaurantAddress,
  pickupTime,
  onStatusUpdate,
  onNavigate,
  onContact,
}: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);

  const getStatusConfig = () => {
    switch (status) {
      case 'pending-pickup':
        return {
          label: 'Pending Pickup',
          color: 'text-warning',
          bgColor: 'bg-warning',
          icon: 'ClockIcon' as const,
        };
      case 'in-transit':
        return {
          label: 'In Transit',
          color: 'text-primary',
          bgColor: 'bg-primary',
          icon: 'TruckIcon' as const,
        };
      case 'delivered':
        return {
          label: 'Delivered',
          color: 'text-success',
          bgColor: 'bg-success',
          icon: 'CheckCircleIcon' as const,
        };
    }
  };

  const statusConfig = getStatusConfig();

  const handleStatusUpdate = (newStatus: string) => {
    if (newStatus === 'delivered') {
      setShowProofUpload(true);
    } else {
      onStatusUpdate(orderId, newStatus);
    }
  };

  const handleProofUpload = () => {
    onStatusUpdate(orderId, 'delivered');
    setShowProofUpload(false);
  };

  return (
    <div className="glass-neon rounded-2xl overflow-hidden card-hover animate-slide-up">
      {/* Header */}
      <div className={`p-4 border-b border-primary/20 ${
        status === 'pending-pickup' ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/20' :
        status === 'in-transit'? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/20' : 'bg-gradient-to-r from-emerald-900/30 to-teal-900/20'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-lg ${
              status === 'pending-pickup' ? 'bg-gradient-to-br from-amber-500 to-yellow-500 shadow-amber-500/30' :
              status === 'in-transit' ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-purple-500/30 animate-glow-pulse' :
              'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30'
            }`}>
              <Icon name={statusConfig.icon} size={20} variant="solid" className="text-white" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Order #{orderNumber}
              </h3>
              <span className={`font-caption text-xs font-bold ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-8 h-8 glass rounded-xl hover:bg-primary/20 transition-all duration-200 press-scale focus-ring"
            aria-label={isExpanded ? 'Collapse order details' : 'Expand order details'}
          >
            <Icon name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={20} className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {paymentMethod === 'COD' && codAmount && (
          <div className="flex items-center gap-2 px-3 py-2 bg-warning/15 border border-warning/30 rounded-xl">
            <Icon name="BanknotesIcon" size={16} variant="solid" className="text-warning" />
            <span className="font-caption text-sm font-bold text-warning">
              💵 Collect ₹{codAmount.toFixed(2)} Cash
            </span>
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div className="p-4 border-b border-primary/15">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Icon name="UserIcon" size={14} className="text-primary" />
              </div>
              <span className="font-heading font-bold text-sm text-foreground">{customerName}</span>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center flex-shrink-0">
                <Icon name="MapPinIcon" size={14} className="text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="font-body text-sm text-text-secondary leading-relaxed">{deliveryAddress}</p>
                {landmark && (
                  <p className="font-caption text-xs text-text-secondary mt-1">📍 {landmark}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center">
                <Icon name="ClockIcon" size={14} className="text-success" />
              </div>
              <span className="font-caption text-xs text-success font-semibold">ETA: {estimatedTime}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onNavigate(deliveryAddress)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-heading font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 press-scale focus-ring btn-glow"
          >
            <Icon name="MapIcon" size={16} variant="solid" />
            <span>Navigate</span>
          </button>
          <button
            onClick={() => onContact(customerPhone)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 glass-neon hover:border-success/50 text-foreground rounded-xl font-heading font-bold text-sm transition-all duration-300 press-scale focus-ring hover-glow-green"
          >
            <Icon name="PhoneIcon" size={16} variant="solid" className="text-success" />
            <span>Call</span>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 border-b border-primary/15 animate-slide-up-sm">
          {/* Pickup Location */}
          <div className="mb-4 pb-4 border-b border-primary/15">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                <Icon name="BuildingStorefrontIcon" size={14} className="text-accent" />
              </div>
              <span className="font-heading font-bold text-sm text-foreground">Pickup Location</span>
            </div>
            <p className="font-body text-sm text-text-secondary ml-9">{restaurantName}</p>
            <p className="font-caption text-xs text-text-secondary ml-9 mt-1">{restaurantAddress}</p>
            {pickupTime && (
              <p className="font-caption text-xs text-primary font-semibold ml-9 mt-1">⏰ Ready by: {pickupTime}</p>
            )}
          </div>

          {/* Order Items */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                <Icon name="ShoppingBagIcon" size={14} className="text-muted-foreground" />
              </div>
              <span className="font-heading font-bold text-sm text-foreground">Order Items ({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 glass rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-data text-sm font-bold text-primary">{item.quantity}×</span>
                    <span className="font-body text-sm text-text-secondary">{item.name}</span>
                  </div>
                  <span className="font-data text-sm font-bold text-foreground">₹{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl">
              <span className="font-heading font-bold text-sm text-white">Total Amount</span>
              <span className="font-data text-base font-bold text-white">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Special Instructions */}
          {specialInstructions && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-xl">
              <div className="flex items-start gap-2">
                <Icon name="ExclamationTriangleIcon" size={16} className="text-warning-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-heading font-medium text-sm text-warning-foreground block mb-1">
                    Special Instructions
                  </span>
                  <p className="font-body text-sm text-warning-foreground leading-relaxed">
                    {specialInstructions}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Actions */}
      {status !== 'delivered' && (
        <div className="p-4 bg-muted">
          {status === 'pending-pickup' && (
            <button
              onClick={() => handleStatusUpdate('in-transit')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success text-success-foreground rounded-sm hover:shadow-geometric-md transition-smooth press-scale focus-ring"
            >
              <Icon name="CheckCircleIcon" size={20} variant="solid" />
              <span className="font-heading font-medium text-base">Mark as Picked Up</span>
            </button>
          )}
          {status === 'in-transit' && (
            <button
              onClick={() => handleStatusUpdate('delivered')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success text-success-foreground rounded-sm hover:shadow-geometric-md transition-smooth press-scale focus-ring"
            >
              <Icon name="CheckBadgeIcon" size={20} variant="solid" />
              <span className="font-heading font-medium text-base">Mark as Delivered</span>
            </button>
          )}
        </div>
      )}

      {/* Proof of Delivery Upload Modal */}
      {showProofUpload && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-md shadow-geometric-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-foreground">
                Proof of Delivery
              </h3>
              <button
                onClick={() => setShowProofUpload(false)}
                className="flex items-center justify-center w-8 h-8 rounded-sm hover:bg-muted transition-smooth press-scale focus-ring"
                aria-label="Close proof upload"
              >
                <Icon name="XMarkIcon" size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-center w-full h-48 bg-muted border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-surface transition-smooth">
                <div className="text-center">
                  <Icon name="CameraIcon" size={48} className="text-muted-foreground mx-auto mb-2" />
                  <p className="font-caption text-sm text-text-secondary">
                    Tap to capture delivery photo
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProofUpload(false)}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-sm hover:shadow-geometric-md transition-smooth press-scale focus-ring"
              >
                <span className="font-caption text-sm font-medium">Cancel</span>
              </button>
              <button
                onClick={handleProofUpload}
                className="flex-1 px-4 py-2 bg-success text-success-foreground rounded-sm hover:shadow-geometric-md transition-smooth press-scale focus-ring"
              >
                <span className="font-caption text-sm font-medium">Confirm Delivery</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;