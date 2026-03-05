// FILE: src/app/rider-dashboard/components/EarningsTracker.tsx

'use client';

import Icon from '@/components/ui/AppIcon';

interface EarningsTrackerProps {
  dailyDeliveries: number;
  completedOrders: number;
  totalEarnings: number;
  baseIncentive: number;
  bonusIncentive: number;
  targetDeliveries: number;
}

const EarningsTracker = ({
  dailyDeliveries,
  completedOrders,
  totalEarnings,
  baseIncentive,
  bonusIncentive,
  targetDeliveries,
}: EarningsTrackerProps) => {
  const progressPercentage = Math.min((dailyDeliveries / targetDeliveries) * 100, 100);
  const remainingDeliveries = Math.max(targetDeliveries - dailyDeliveries, 0);

  return (
    <div className="glass-green rounded-2xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 border-b border-success/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/30 animate-glow-pulse-green">
              <Icon name="CurrencyRupeeIcon" size={24} variant="solid" className="text-white" />
            </div>
            <div>
              <span className="font-caption text-xs text-success/80 block mb-0.5 uppercase tracking-wider">
                Today's Earnings
              </span>
              <span className="font-data text-3xl font-bold text-gradient-green">
                ₹{totalEarnings.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-caption text-xs text-success/80 block mb-0.5 uppercase tracking-wider">
              Deliveries
            </span>
            <span className="font-data text-3xl font-bold text-gradient-green">
              {dailyDeliveries}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b border-success/15">
        <div className="p-3 glass rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-success/20 flex items-center justify-center">
              <Icon name="CheckCircleIcon" size={16} className="text-success" />
            </div>
            <span className="font-caption text-xs text-text-secondary">Completed</span>
          </div>
          <span className="font-data text-2xl font-bold text-foreground">{completedOrders}</span>
        </div>

        <div className="p-3 glass rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon name="BanknotesIcon" size={16} className="text-primary" />
            </div>
            <span className="font-caption text-xs text-text-secondary">Base Pay</span>
          </div>
          <span className="font-data text-2xl font-bold text-foreground">₹{baseIncentive}</span>
        </div>
      </div>

      {/* Progress to Bonus */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-heading font-bold text-sm text-foreground">🎯 Progress to Bonus</span>
          <span className="font-caption text-xs text-text-secondary">
            {dailyDeliveries}/{targetDeliveries} deliveries
          </span>
        </div>

        <div className="relative w-full h-3 glass rounded-full overflow-hidden mb-1">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
        <div className="flex justify-between mb-4">
          <span className="font-caption text-xs text-success">{progressPercentage.toFixed(0)}%</span>
          <span className="font-caption text-xs text-text-secondary">{remainingDeliveries} more to go</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-warning/30 rounded-xl">
          <div className="flex items-center gap-2">
            <Icon name="TrophyIcon" size={18} variant="solid" className="text-warning animate-float" />
            <span className="font-heading font-semibold text-sm text-warning">Bonus Incentive</span>
          </div>
          <span className="font-data text-lg font-bold text-gradient-gold">₹{bonusIncentive.toFixed(2)}</span>
        </div>

        {remainingDeliveries > 0 && (
          <p className="font-caption text-xs text-text-secondary text-center mt-3">
            Complete {remainingDeliveries} more {remainingDeliveries === 1 ? 'delivery' : 'deliveries'} to unlock bonus! 🚀
          </p>
        )}

        {remainingDeliveries === 0 && (
          <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-success/15 border border-success/30 rounded-xl">
            <Icon name="CheckBadgeIcon" size={18} variant="solid" className="text-success" />
            <span className="font-heading font-bold text-sm text-success">🎉 Bonus Unlocked!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsTracker;