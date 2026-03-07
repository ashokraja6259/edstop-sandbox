// FILE: src/app/dark-store-shopping/components/CategoryFilter.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Category {
  id: string;
  name: string;
  icon: 'ShoppingBagIcon' | 'CakeIcon' | 'BeakerIcon' | 'PencilIcon' | 'SparklesIcon';
  count: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 px-4 py-3 glass-neon rounded-xl whitespace-nowrap animate-pulse"
          >
            <div className="w-5 h-5 bg-muted/30 rounded-lg" />
            <span className="font-heading font-medium text-sm text-foreground">
              {category.name}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category, index) => {
        const isSelected = selectedCategory === category.id;
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap
              transition-all duration-300 press-scale focus-ring btn-glow
              animate-slide-up stagger-${Math.min(index + 1, 6)}
              ${isSelected 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-105' 
                : 'glass-neon text-foreground hover:border-primary/50 hover-glow-purple'
              }
            `}
          >
            <Icon 
              name={category.icon} 
              size={20} 
              variant={isSelected ? 'solid' : 'outline'}
              className={isSelected ? 'animate-bounce' : 'group-hover:animate-wiggle'}
            />
            <span className="font-heading font-semibold text-sm">
              {category.name}
            </span>
            <span className={`font-caption text-xs px-1.5 py-0.5 rounded-full ${
              isSelected ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
            }`}>
              {category.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;