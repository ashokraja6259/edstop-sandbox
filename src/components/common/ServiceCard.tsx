// FILE: src/components/common/ServiceCard.tsx

'use client';

import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { IconProps } from '@/components/ui/AppIcon';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: IconProps['name'];
  href: string;
  badge?: string;
  isActive?: boolean;
  activeOrderCount?: number;
}

const ServiceCard = ({
  title,
  description,
  icon,
  href,
  badge,
  isActive = true,
  activeOrderCount = 0,
}: ServiceCardProps) => {
  return (
    <Link
      href={href}
      className={`
        relative block p-6 glass-card rounded-2xl border border-white/10
        hover:border-purple-500/40 shadow-geometric
        hover:shadow-glow-purple transition-smooth hover-lift press-scale
        focus-ring group overflow-hidden
        ${!isActive ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      onClick={(e) => { if (!isActive) e.preventDefault(); }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-smooth rounded-2xl"></div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center justify-center w-12 h-12 gradient-primary rounded-xl shadow-glow-purple group-hover:scale-110 transition-smooth">
            <Icon name={icon} size={24} variant="outline" className="text-white" />
          </div>
          {badge && (
            <span className="px-2.5 py-1 bg-pink-500/20 text-pink-300 text-xs font-bold rounded-full border border-pink-500/30">
              {badge}
            </span>
          )}
        </div>

        <h3 className="font-bold text-xl text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 leading-relaxed mb-4">{description}</p>

        {activeOrderCount > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400 font-semibold">
              {activeOrderCount} active {activeOrderCount === 1 ? 'order' : 'orders'}
            </span>
          </div>
        )}

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-2xl backdrop-blur-sm">
            <span className="text-sm text-white/60 font-semibold bg-white/10 px-4 py-2 rounded-full border border-white/20">
              🚧 Coming Soon
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ServiceCard;