'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface Variant {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  isVeg: boolean;
  dietaryType?: string | null;
  spiceLevel?: string | null;
  badge?: string | null;
  variants?: Variant[];
  customizable: boolean;
}

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (itemId: string, quantity: number, variantId?: string) => void;
  cartQuantity: number;
  isOrderable?: boolean;
}

const MenuItemCard = ({
  item,
  onAddToCart,
  cartQuantity,
  isOrderable = true,
}: MenuItemCardProps) => {

  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    item.variants?.[0]?.id
  );
  const [showVariants, setShowVariants] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  /* ================= PRICE ================= */

  const getItemPrice = () => {

    if (item.variants && selectedVariant) {
      const variant = item.variants.find(v => v.id === selectedVariant);
      return variant?.price ?? item.price;
    }

    return item.price;

  };

  /* ================= ADD ================= */

  const handleAdd = () => {

    const newQuantity = cartQuantity + 1;

    onAddToCart(
      item.id,
      newQuantity,
      selectedVariant
    );

    setIsAdding(true);
    setTimeout(() => setIsAdding(false), 300);

  };

  /* ================= REMOVE ================= */

  const handleRemove = () => {

    const newQuantity = cartQuantity - 1;

    if (newQuantity < 0) return;

    onAddToCart(
      item.id,
      newQuantity,
      selectedVariant
    );

  };

  const price = getItemPrice();
  const dietaryType = item.dietaryType || (item.isVeg ? 'Veg' : 'Non-Veg');
  const isVegetarian = dietaryType === 'Veg';

  /* ================= UI ================= */

  return (
    <div className="p-4 glass-neon rounded-xl card-hover group">

      <div className="flex gap-4">

        {/* LEFT SIDE */}

        <div className="flex-1 min-w-0">

          <div className="flex items-start gap-2 mb-2">

            <div
              className={`flex items-center justify-center w-5 h-5 border-2 rounded-sm flex-shrink-0 mt-0.5 ${
                isVegetarian
                  ? 'border-success bg-success/10'
                  : 'border-destructive bg-destructive/10'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isVegetarian ? 'bg-success' : 'bg-destructive'
                }`}
              />
            </div>

            <h4 className="font-heading font-bold text-base text-foreground flex-1 group-hover:text-primary transition-colors">
              {item.name}
            </h4>

          </div>

          <p className="font-body text-sm text-text-secondary mb-3 line-clamp-2">
            {item.description}
          </p>

          <div className="mb-3 flex flex-wrap gap-2 text-xs text-text-secondary">
            <span>{dietaryType}</span>
            {item.spiceLevel && <span>• {item.spiceLevel}</span>}
            {item.badge && <span>• {item.badge}</span>}
          </div>

          {/* PRICE */}

          <div className="flex items-center gap-2 mb-3">

            <span className="font-data text-xl font-bold text-primary">
              ₹{price}
            </span>

            {item.customizable && (
              <span className="px-2 py-0.5 glass text-primary text-xs font-caption font-semibold rounded-lg border border-primary/30">
                ✨ Customizable
              </span>
            )}

          </div>

          {/* VARIANTS */}

          {item.variants && item.variants.length > 0 && (

            <div className="mb-3">

              <button
                onClick={() => setShowVariants(!showVariants)}
                className="flex items-center gap-2 text-sm font-caption font-semibold text-primary"
              >
                Choose variant
                <Icon
                  name={showVariants ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                  size={16}
                />
              </button>

              {showVariants && (

                <div className="mt-2 space-y-2">

                  {item.variants.map(variant => (

                    <label
                      key={variant.id}
                      className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg ${
                        selectedVariant === variant.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/30'
                      }`}
                    >

                      <input
                        type="radio"
                        name={`variant-${item.id}`}
                        value={variant.id}
                        checked={selectedVariant === variant.id}
                        onChange={() => setSelectedVariant(variant.id)}
                      />

                      <span className="text-sm">{variant.name}</span>

                      <span className="font-bold ml-auto">
                        ₹{variant.price}
                      </span>

                    </label>

                  ))}

                </div>

              )}

            </div>

          )}

        </div>

        {/* RIGHT SIDE */}

        <div className="flex flex-col items-end gap-3">

          <div className="relative w-24 h-24 rounded-xl overflow-hidden">

            <AppImage
              src={item.image || '/images/food-placeholder.png'}
              alt={item.alt}
              className="w-full h-full object-cover"
            />

          </div>

          {/* ADD BUTTON */}

          {!isOrderable ? (

            <span className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
              Opening Soon
            </span>

          ) : cartQuantity === 0 ? (

            <button
              onClick={handleAdd}
              className={`px-5 py-2 bg-primary text-white font-heading font-bold text-sm rounded-xl ${
                isAdding ? 'scale-95' : ''
              }`}
            >
              {isAdding ? '✓' : 'ADD'}
            </button>

          ) : (

            <div className="flex items-center gap-1 bg-primary rounded-xl">

              <button
                onClick={handleRemove}
                className="w-8 h-8 flex items-center justify-center text-white"
              >
                <Icon name="MinusIcon" size={16} />
              </button>

              <span className="font-data text-sm font-bold text-white min-w-[24px] text-center">
                {cartQuantity}
              </span>

              <button
                onClick={handleAdd}
                className="w-8 h-8 flex items-center justify-center text-white"
              >
                <Icon name="PlusIcon" size={16} />
              </button>

            </div>

          )}

        </div>

      </div>

    </div>
  );
};

export default MenuItemCard;
