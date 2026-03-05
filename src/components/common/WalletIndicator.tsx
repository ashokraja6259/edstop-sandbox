// FILE: src/components/common/WalletIndicator.tsx

'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface WalletIndicatorProps {
  balance: number;
  cashbackEarned?: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const WalletIndicator = ({
  balance,
  cashbackEarned = 0,
  showDetails = false,
  size = 'md',
  onClick,
}: WalletIndicatorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (showDetails) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`
        inline-flex flex-col bg-card border border-border rounded-md
        shadow-geometric hover:shadow-geometric-md
        transition-smooth
        ${onClick || showDetails ? 'cursor-pointer hover-lift press-scale' : ''}
      `}
      onClick={handleClick}
    >
      <div className={`flex items-center gap-3 ${sizeClasses[size]}`}>
        <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-sm shadow-geometric-sm">
          <Icon 
            name="CurrencyRupeeIcon" 
            size={iconSizes[size]} 
            variant="solid" 
            className="text-accent-foreground" 
          />
        </div>
        
        <div className="flex flex-col">
          <span className="font-caption text-xs text-text-secondary leading-none mb-1">
            EdCoins Balance
          </span>
          <span className="font-data font-medium text-foreground leading-none">
            ₹{balance.toFixed(2)}
          </span>
        </div>

        {showDetails && (
          <Icon 
            name={isExpanded ? "ChevronUpIcon" : "ChevronDownIcon"} 
            size={16} 
            className="text-muted-foreground ml-2" 
          />
        )}
      </div>

      {showDetails && isExpanded && (
        <div className="px-4 py-3 border-t border-border bg-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="font-caption text-xs text-text-secondary">
              Cashback Earned
            </span>
            <span className="font-data text-sm font-medium text-success">
              +₹{cashbackEarned.toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-caption text-xs text-text-secondary">
              Redemption Limit
            </span>
            <span className="font-data text-sm font-medium text-foreground">
              ₹{(balance * 0.4).toFixed(2)}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <p className="font-caption text-xs text-text-secondary leading-relaxed">
              You can redeem up to 40% of your order value using EdCoins
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletIndicator;