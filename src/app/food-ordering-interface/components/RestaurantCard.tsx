// FILE: src/app/food-ordering-interface/components/RestaurantCard.tsx

'use client';

import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface RestaurantCardProps {
  id: string;
  name: string;
  image: string | null;
  alt?: string;
  cuisines?: string[];
  rating?: number | null;
  deliveryTime?: string;
  minimumOrder?: number;
  isSelected: boolean;
  isAvailable?: boolean;
  onClick: () => void;
}

const RestaurantCard = ({
  name,
  image,
  alt = 'Restaurant',
  cuisines = [],
  rating = 0,
  deliveryTime = '—',
  minimumOrder = 0,
  isSelected,
  isAvailable = true,
  onClick,
}: RestaurantCardProps) => {

  const safeRating = Number(rating) || 0;

  const handleClick = () => {
    if (!isAvailable) return;
    onClick();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
      className={`
        p-4 rounded-xl group
        transition-all duration-300 press-scale btn-glow
        ${isSelected 
          ? 'gradient-border shadow-lg shadow-purple-500/30 bg-gradient-to-br from-purple-900/40 to-indigo-900/40' 
          : isAvailable
          ? 'glass-neon hover-glow-purple cursor-pointer'
          : 'glass-neon opacity-60 cursor-not-allowed'
        }
      `}
    >

      <div className="flex gap-4">

        {/* IMAGE */}

        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">

          <AppImage
            src={
              image ||
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5'
            }
            alt={alt}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              !isAvailable ? 'grayscale' : ''
            }`}
          />

          {isSelected && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Icon
                  name="CheckIcon"
                  size={14}
                  variant="solid"
                  className="text-white"
                />
              </div>
            </div>
          )}

          {!isAvailable && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="font-caption text-xs font-bold text-destructive bg-background/80 px-2 py-0.5 rounded-sm">
                Closed
              </span>
            </div>
          )}

        </div>

        {/* INFO */}

        <div className="flex-1 min-w-0">

          <div className="flex items-center gap-2 mb-1">

            <h3
              className={`font-heading font-bold text-base truncate transition-all duration-200 ${
                isSelected
                  ? 'text-gradient-purple'
                  : 'text-foreground group-hover:text-primary'
              }`}
            >
              {name}
            </h3>

            {!isAvailable && (
              <span className="px-1.5 py-0.5 bg-destructive/15 text-destructive font-caption text-xs rounded flex-shrink-0">
                Unavailable
              </span>
            )}

          </div>

          <p className="font-caption text-xs text-text-secondary mb-2 truncate">
            {cuisines.length > 0
              ? cuisines.join(' • ')
              : 'Various cuisines'}
          </p>

          {/* META */}

          <div className="flex items-center gap-3 flex-wrap">

            <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/15 rounded-lg">
              <Icon
                name="StarIcon"
                size={12}
                variant="solid"
                className="text-warning"
              />
              <span className="font-data text-xs font-bold text-warning">
                {safeRating.toFixed(1)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Icon
                name="ClockIcon"
                size={12}
                className="text-text-secondary"
              />
              <span className="font-caption text-xs text-text-secondary">
                {deliveryTime}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Icon
                name="CurrencyRupeeIcon"
                size={12}
                className="text-text-secondary"
              />
              <span className="font-caption text-xs text-text-secondary">
                ₹{minimumOrder} min
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default RestaurantCard;