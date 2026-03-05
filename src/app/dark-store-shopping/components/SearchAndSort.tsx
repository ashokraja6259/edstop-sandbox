// FILE: src/app/dark-store-shopping/components/SearchAndSort.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface SearchAndSortProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'price-low' | 'price-high' | 'popularity' | 'availability';
  onSortChange: (sort: 'price-low' | 'price-high' | 'popularity' | 'availability') => void;
}

const SearchAndSort = ({ searchQuery, onSearchChange, sortBy, onSortChange }: SearchAndSortProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const sortOptions = [
    { value: 'popularity' as const, label: 'Most Popular', icon: '🔥' },
    { value: 'price-low' as const, label: 'Price: Low to High', icon: '📉' },
    { value: 'price-high' as const, label: 'Price: High to Low', icon: '📈' },
    { value: 'availability' as const, label: 'In Stock First', icon: '✅' },
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort By';
  const currentSortIcon = sortOptions.find(opt => opt.value === sortBy)?.icon || '⚡';

  if (!isHydrated) {
    return (
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 glass-neon rounded-xl animate-pulse">
          <div className="w-5 h-5 bg-muted/30 rounded-lg" />
          <div className="h-4 bg-muted/30 rounded-lg flex-1" />
        </div>
        <div className="px-4 py-3 glass-neon rounded-xl animate-pulse">
          <div className="w-24 h-4 bg-muted/30 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex-1 relative">
        <Icon 
          name="MagnifyingGlassIcon" 
          size={20} 
          className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
            isFocused ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search products..."
          className={`
            w-full pl-12 pr-4 py-3 glass-neon rounded-xl
            font-body text-sm text-foreground placeholder:text-muted-foreground
            focus:outline-none transition-all duration-300
            ${isFocused ? 'border-primary/60 shadow-lg shadow-primary/20' : 'border-border'}
          `}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 press-scale w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted/50"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="flex items-center gap-2 px-4 py-3 glass-neon rounded-xl hover:border-primary/50 transition-all duration-300 press-scale focus-ring whitespace-nowrap hover-glow-purple"
        >
          <span className="text-base">{currentSortIcon}</span>
          <span className="font-heading font-semibold text-sm text-foreground hidden sm:inline">
            {currentSortLabel}
          </span>
          <Icon 
            name={showSortMenu ? "ChevronUpIcon" : "ChevronDownIcon"} 
            size={16} 
            className={`text-muted-foreground transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`}
          />
        </button>

        {showSortMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 glass-ultra rounded-xl shadow-2xl shadow-black/50 z-10 overflow-hidden animate-scale-in">
            {sortOptions.map((option, index) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setShowSortMenu(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  transition-all duration-200 hover:bg-primary/20
                  ${sortBy === option.value ? 'bg-primary/20 text-primary' : 'text-foreground'}
                `}
              >
                <span className="text-base">{option.icon}</span>
                <span className="font-body text-sm flex-1">{option.label}</span>
                {sortBy === option.value && (
                  <Icon name="CheckIcon" size={16} className="text-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAndSort;