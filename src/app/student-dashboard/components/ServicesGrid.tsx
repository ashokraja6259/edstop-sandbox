// FILE: src/app/student-dashboard/components/ServicesGrid.tsx

'use client';

import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { IconProps } from '@/components/ui/AppIcon';
import ErrorFallback from '@/components/ui/ErrorFallback';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: IconProps['name'];
  href: string;
  badge?: string;
  isActive: boolean;
  activeOrderCount: number;
}

interface ServicesGridProps {
  services: Service[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

const serviceConfig: Record<string, { gradient: string; glow: string; emoji: string; accent: string }> = {
  'food-delivery': {
    gradient: 'from-orange-500 to-red-600',
    glow: 'group-hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]',
    emoji: '🍔',
    accent: 'text-orange-400',
  },
  'dark-store': {
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]',
    emoji: '🛒',
    accent: 'text-blue-400',
  },
  'ai-companion': {
    gradient: 'from-purple-500 to-violet-600',
    glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]',
    emoji: '🤖',
    accent: 'text-purple-400',
  },
};

const ServicesGrid = ({ services, isLoading = false, hasError = false, onRetry }: ServicesGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="glass-card rounded-2xl p-6 border border-white/10">
            <div className="flex items-start justify-between mb-4">
              <div className="animate-pulse w-14 h-14 bg-white/10 rounded-2xl"></div>
              <div className="animate-pulse h-6 bg-white/10 rounded-full w-24"></div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="animate-pulse h-5 bg-white/10 rounded w-3/4"></div>
              <div className="animate-pulse h-3 bg-white/5 rounded w-full"></div>
              <div className="animate-pulse h-3 bg-white/5 rounded w-4/5"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="animate-pulse h-4 bg-white/10 rounded w-24"></div>
              <div className="animate-pulse h-4 bg-white/10 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <ErrorFallback
        type="api"
        title="Services unavailable"
        description="Couldn't load campus services. Please try again."
        onRetry={onRetry}
        variant="minimal"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service, index) => {
        const config = serviceConfig[service.id] || serviceConfig['food-delivery'];
        return (
          <Link
            key={service.id}
            href={service.isActive ? service.href : '#'}
            className={`
              relative block glass-card rounded-2xl p-6 border border-white/10
              hover-lift transition-smooth group overflow-hidden
              ${config.glow} focus-ring
              ${ !service.isActive ? 'opacity-60 cursor-not-allowed' : '' }
              animate-slide-up
            `}
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={(e) => { if (!service.isActive) e.preventDefault(); }}
          >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-5 transition-smooth rounded-2xl`}></div>

            {/* Animated corner accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${config.gradient} opacity-10 rounded-full -mr-12 -mt-12 group-hover:opacity-20 transition-smooth`}></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-geometric-md group-hover:scale-110 transition-smooth`}>
                  <span className="text-2xl">{config.emoji}</span>
                </div>
                {service.badge && (
                  <span className="px-2.5 py-1 bg-white/10 text-white/80 text-xs font-semibold rounded-full border border-white/20 backdrop-blur-sm">
                    {service.badge}
                  </span>
                )}
              </div>

              <h3 className="font-bold text-xl text-white mb-2 group-hover:text-white transition-smooth">
                {service.title}
              </h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                {service.description}
              </p>

              <div className="flex items-center justify-between">
                {service.activeOrderCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400 font-semibold">
                      {service.activeOrderCount} active order
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-white/40">Ready to order</span>
                )}
                <div className={`flex items-center gap-1 ${config.accent} group-hover:translate-x-1 transition-smooth`}>
                  <span className="text-sm font-semibold">Order now</span>
                  <Icon name="ArrowRightIcon" size={16} />
                </div>
              </div>
            </div>

            {!service.isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-2xl backdrop-blur-sm">
                <span className="text-sm text-white/60 font-semibold bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  🚧 Coming Soon
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default ServicesGrid;