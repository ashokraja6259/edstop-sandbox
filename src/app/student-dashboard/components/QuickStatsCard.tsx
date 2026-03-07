// FILE: src/app/student-dashboard/components/QuickStatsCard.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Stat {
  label: string;
  value: string;
  icon: 'ShoppingBagIcon' | 'CurrencyRupeeIcon' | 'StarIcon' | 'TruckIcon';
  color: 'primary' | 'success' | 'accent' | 'warning';
}

interface QuickStatsCardProps {
  stats: Stat[];
}

const QuickStatsCard = ({ stats }: QuickStatsCardProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getConfig = (color: Stat['color']) => {
    const configs = {
      primary: {
        gradient: 'from-violet-600 to-purple-700',
        glow: 'shadow-glow-purple',
        border: 'border-purple-500/30',
        bg: 'bg-purple-500/10',
        text: 'text-purple-300',
        ring: 'ring-purple-500/20',
      },
      success: {
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'shadow-glow-green',
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-300',
        ring: 'ring-emerald-500/20',
      },
      accent: {
        gradient: 'from-pink-500 to-rose-600',
        glow: 'shadow-glow-pink',
        border: 'border-pink-500/30',
        bg: 'bg-pink-500/10',
        text: 'text-pink-300',
        ring: 'ring-pink-500/20',
      },
      warning: {
        gradient: 'from-amber-500 to-orange-600',
        glow: '',
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        text: 'text-amber-300',
        ring: 'ring-amber-500/20',
      },
    };
    return configs[color];
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const config = getConfig(stat.color);
        return (
          <div
            key={index}
            className={`glass-card rounded-2xl p-5 border ${config.border} hover-lift transition-smooth group cursor-default
              ${ visible ? 'animate-bounce-in' : 'opacity-0' }`}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} ${config.glow} group-hover:scale-110 transition-smooth`}>
                <Icon name={stat.icon} size={22} variant="solid" className="text-white" />
              </div>
              <div className={`w-2 h-2 rounded-full ${config.bg} border ${config.border} animate-pulse`}></div>
            </div>
            <p className={`font-bold text-3xl text-white mb-1 group-hover:${config.text} transition-smooth`}>
              {stat.value}
            </p>
            <p className={`text-xs ${config.text} font-semibold uppercase tracking-wide`}>
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default QuickStatsCard;