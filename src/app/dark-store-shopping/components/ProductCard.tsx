// FILE: src/app/dark-store-shopping/components/ProductCard.tsx

'use client';

import { useState, useEffect } from 'react';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  alt: string;
  stock: number;
  category: string;
  popularity: number;
}

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  onAddToCart: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

const ProductCard = ({ product, cartQuantity, onAddToCart, onUpdateQuantity }: ProductCardProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    setIsAdding(true);
    onAddToCart(product.id);
    setTimeout(() => setIsAdding(false), 600);
  };

  if (!isHydrated) {
    return (
      <div className="glass-neon rounded-xl overflow-hidden animate-pulse">
        <div className="relative w-full h-48 bg-muted/30" />
        <div className="p-4">
          <div className="h-5 bg-muted/30 rounded-lg mb-2" />
          <div className="h-4 bg-muted/30 rounded-lg w-20 mb-4" />
          <div className="h-10 bg-muted/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`
      glass-neon rounded-xl overflow-hidden card-hover group
      ${isOutOfStock ? 'opacity-60' : ''}
      animate-fade-in
    `}>
      <div className="relative w-full h-48 overflow-hidden bg-muted/20">
        <AppImage
          src={product.image}
          alt={product.alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                <Icon name="XCircleIcon" size={28} className="text-destructive" />
              </div>
              <span className="font-heading font-semibold text-sm text-destructive">
                Out of Stock
              </span>
            </div>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-warning/90 backdrop-blur-sm rounded-lg animate-pulse">
            <span className="font-caption text-xs font-bold text-warning-foreground">
              🔥 Only {product.stock} left
            </span>
          </div>
        )}
        {product.popularity >= 90 && !isOutOfStock && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg">
            <span className="font-caption text-xs font-bold text-white">⭐ Popular</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-heading font-semibold text-base text-foreground mb-1 line-clamp-2 group-hover:text-gradient-purple transition-all duration-300">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mb-4">
          <span className="font-data font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ₹{product.price.toFixed(2)}
          </span>
          {product.stock > 5 && (
            <span className="font-caption text-xs text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block animate-pulse"></span>
              In Stock
            </span>
          )}
        </div>

        {cartQuantity === 0 ? (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              font-heading font-semibold text-sm btn-glow
              transition-all duration-300 press-scale focus-ring
              ${isAdding ? 'scale-95' : ''}
              ${isOutOfStock 
                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg hover:shadow-purple-500/30'
              }
            `}
          >
            <Icon name="ShoppingCartIcon" size={18} variant="outline" className={isAdding ? 'animate-bounce' : ''} />
            {isOutOfStock ? 'Unavailable' : isAdding ? 'Added! ✓' : 'Add to Cart'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
              className="flex items-center justify-center w-10 h-10 glass rounded-xl hover:bg-primary/20 transition-all duration-200 press-scale focus-ring hover-glow-purple"
            >
              <Icon name="MinusIcon" size={18} className="text-foreground" />
            </button>
            <div className="flex-1 flex items-center justify-center h-10 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-xl border border-primary/30">
              <span className="font-data font-bold text-base text-primary animate-bounce-in">
                {cartQuantity}
              </span>
            </div>
            <button
              onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
              disabled={cartQuantity >= product.stock}
              className={`
                flex items-center justify-center w-10 h-10 rounded-xl
                transition-all duration-200 press-scale focus-ring
                ${cartQuantity >= product.stock 
                  ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 hover-glow-purple'
                }
              `}
            >
              <Icon name="PlusIcon" size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;