// FILE: src/app/promotions/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface PromoCode {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: string;
  discountType: 'cashback' | 'discount' | 'free-delivery';
  validUntil: string;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  applicableServices: string[];
  isNew?: boolean;
}

interface ReferralStats {
  totalEarned: number;
  pendingRewards: number;
  successfulReferrals: number;
  pendingReferrals: number;
  clickThroughRate: number;
  conversionRate: number;
  lifetimeEarnings: number;
  currentTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  nextTierAt: number;
  referralCode: string;
}

interface SeasonalOffer {
  id: string;
  title: string;
  description: string;
  discount: string;
  badge: string;
  emoji: string;
  gradient: string;
  validUntil: string;
  endsInMs: number;
  code: string;
  highlight: string;
}

const promoCodes: PromoCode[] = [
  {
    id: 'promo1',
    code: 'EDCASH5',
    title: '5% Cashback on All Orders',
    description: 'Get 5% cashback on every order. Credited to wallet within 24 hours.',
    discount: '5% Cashback',
    discountType: 'cashback',
    validUntil: '24 Apr 2026',
    minOrder: 149,
    maxUses: 500,
    usedCount: 312,
    applicableServices: ['Food Delivery', 'Dark Store'],
    isNew: false,
  },
  {
    id: 'promo2',
    code: 'KGPFREE',
    title: 'Free Delivery for IIT KGP',
    description: 'Exclusive free delivery for IIT Kharagpur students on food orders.',
    discount: 'Free Delivery',
    discountType: 'free-delivery',
    validUntil: '31 Mar 2026',
    minOrder: 0,
    maxUses: 1000,
    usedCount: 678,
    applicableServices: ['Food Delivery'],
    isNew: true,
  },
  {
    id: 'promo3',
    code: 'STORE20',
    title: '20% Off Dark Store',
    description: 'Flat 20% discount on all dark store essentials. Max discount ₹100.',
    discount: '20% Off',
    discountType: 'discount',
    validUntil: '15 Mar 2026',
    minOrder: 199,
    maxUses: 200,
    usedCount: 189,
    applicableServices: ['Dark Store'],
    isNew: false,
  },
  {
    id: 'promo4',
    code: 'NEWUSER50',
    title: '₹50 Off First Order',
    description: 'Welcome offer for new users. Flat ₹50 off on your first order.',
    discount: '₹50 Off',
    discountType: 'discount',
    validUntil: '30 Jun 2026',
    minOrder: 99,
    maxUses: 300,
    usedCount: 145,
    applicableServices: ['Food Delivery', 'Dark Store'],
    isNew: true,
  },
];

const referralStats: ReferralStats = {
  totalEarned: 450,
  pendingRewards: 75,
  successfulReferrals: 9,
  pendingReferrals: 3,
  clickThroughRate: 34.2,
  conversionRate: 22.5,
  lifetimeEarnings: 450,
  currentTier: 'Silver',
  nextTierAt: 15,
  referralCode: 'EDSTOP-KGP-7X9K',
};

const tierConfig = {
  Bronze: { color: 'text-amber-600', bg: 'bg-amber-600/20', border: 'border-amber-600/30', gradient: 'from-amber-600 to-yellow-700', emoji: '🥉', reward: '₹25/referral', minReferrals: 0 },
  Silver: { color: 'text-slate-300', bg: 'bg-slate-400/20', border: 'border-slate-400/30', gradient: 'from-slate-400 to-slate-500', emoji: '🥈', reward: '₹50/referral', minReferrals: 5 },
  Gold: { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30', gradient: 'from-yellow-400 to-amber-500', emoji: '🥇', reward: '₹75/referral', minReferrals: 15 },
  Platinum: { color: 'text-purple-300', bg: 'bg-purple-400/20', border: 'border-purple-400/30', gradient: 'from-purple-400 to-violet-500', emoji: '💎', reward: '₹100/referral', minReferrals: 30 },
};

const seasonalOffers: SeasonalOffer[] = [
  {
    id: 'seasonal1',
    title: 'Holi Special 🎨',
    description: 'Celebrate Holi with flat 30% off on all food orders. Limited time festival deal!',
    discount: '30% Off',
    badge: 'Festival Deal',
    emoji: '🎨',
    gradient: 'from-pink-500 via-purple-500 to-indigo-500',
    validUntil: '14 Mar 2026',
    endsInMs: new Date('2026-03-14').getTime() - Date.now(),
    code: 'HOLI30',
    highlight: 'Max discount ₹150',
  },
  {
    id: 'seasonal2',
    title: 'Spring Semester Sale 📚',
    description: 'Exclusive semester-start deals. Get 15% cashback on dark store essentials.',
    discount: '15% Cashback',
    badge: 'Semester Offer',
    emoji: '📚',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    validUntil: '31 Mar 2026',
    endsInMs: new Date('2026-03-31').getTime() - Date.now(),
    code: 'SPRING15',
    highlight: 'On all essentials',
  },
  {
    id: 'seasonal3',
    title: 'Weekend Binge 🍕',
    description: 'Every weekend, enjoy free delivery + 10% off on orders above ₹299.',
    discount: 'Free Delivery + 10%',
    badge: 'Weekend Only',
    emoji: '🍕',
    gradient: 'from-orange-500 via-red-500 to-rose-500',
    validUntil: 'Every Weekend',
    endsInMs: 0,
    code: 'WEEKEND10',
    highlight: 'Min order ₹299',
  },
];

const getPromoConfig = (type: PromoCode['discountType']) => {
  const configs = {
    cashback: { gradient: 'from-emerald-500 to-teal-600', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', emoji: '💰' },
    discount: { gradient: 'from-blue-500 to-indigo-600', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', emoji: '🏷️' },
    'free-delivery': { gradient: 'from-purple-500 to-violet-600', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', emoji: '🚚' },
  };
  return configs[type];
};

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

export default function PromotionsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'promo' | 'referral' | 'seasonal'>('promo');
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const initial: Record<string, number> = {};
    seasonalOffers.forEach(o => {
      if (o.endsInMs > 0) initial[o.id] = o.endsInMs;
    });
    setCountdowns(initial);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          updated[k] = Math.max(0, updated[k] - 1000);
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isHydrated]);

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const handleCopyLink = useCallback(() => {
    const link = `https://edstop.app/ref/${referralStats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, []);

  const handleShare = useCallback((platform: string) => {
    const link = `https://edstop.app/ref/${referralStats.referralCode}`;
    const text = `Join EdStop - the ultimate campus commerce app at IIT KGP! Use my referral code ${referralStats.referralCode} and get ₹50 off your first order. 🎓`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      email: `mailto:?subject=Join EdStop Campus App&body=${encodeURIComponent(text + '\n\n' + link)}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
  }, []);

  const currentTier = tierConfig[referralStats.currentTier];
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;
  const currentTierIndex = tiers.indexOf(referralStats.currentTier);
  const progressToNext = currentTierIndex < 3
    ? ((referralStats.successfulReferrals - tierConfig[tiers[currentTierIndex]].minReferrals) /
       (tierConfig[tiers[currentTierIndex + 1]].minReferrals - tierConfig[tiers[currentTierIndex]].minReferrals)) * 100
    : 100;

  return (
    <div className="min-h-screen gradient-mesh dot-pattern">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-500/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/student-dashboard" className="flex items-center justify-center w-9 h-9 rounded-xl glass hover:bg-white/10 transition-smooth press-scale">
                <Icon name="ArrowLeftIcon" size={18} className="text-white/80" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-glow-purple">
                  <span className="text-lg">🎁</span>
                </div>
                <div>
                  <h1 className="font-bold text-lg text-white leading-tight">Promotions</h1>
                  <p className="text-xs text-purple-300/70">Deals, codes & referrals</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                <span className="text-xs font-semibold text-emerald-400">₹{referralStats.totalEarned} Earned</span>
              </div>
              <Link
                href="/promotions-analytics-dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass hover:bg-white/10 transition-smooth press-scale border border-white/10"
              >
                <Icon name="ChartBarIcon" size={14} className="text-purple-400" />
                <span className="text-xs font-medium text-white/70 hidden sm:inline">Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Banner */}
        <div className="relative mb-6 p-6 rounded-3xl overflow-hidden animate-slide-up">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.9) 0%, rgba(79,70,229,0.85) 40%, rgba(236,72,153,0.8) 100%)' }}></div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 animate-spin-slow"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 animate-float"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white border border-white/30">🔥 Active Deals</span>
                <span className="px-2.5 py-1 bg-yellow-400/20 backdrop-blur-sm rounded-full text-xs font-bold text-yellow-300 border border-yellow-400/30">{promoCodes.length} Codes</span>
              </div>
              <h2 className="font-bold text-2xl md:text-3xl text-white mb-1">Save More, Earn More</h2>
              <p className="text-white/80 text-sm">Exclusive deals for IIT KGP students 🎓</p>
            </div>
            <div className="hidden md:block text-6xl animate-bounce-in">🎉</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 p-1 glass-card rounded-2xl border border-white/10 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          {[
            { key: 'promo', label: 'Promo Codes', emoji: '🏷️', count: promoCodes.length },
            { key: 'referral', label: 'Referral', emoji: '👥', count: referralStats.successfulReferrals },
            { key: 'seasonal', label: 'Seasonal', emoji: '🌟', count: seasonalOffers.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-smooth press-scale ${
                activeTab === tab.key
                  ? 'gradient-primary text-white shadow-glow-purple'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* PROMO CODES TAB */}
        {activeTab === 'promo' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg text-white">Active Promo Codes</h2>
              <span className="text-xs text-white/50">{promoCodes.length} available</span>
            </div>
            {promoCodes.map((promo, index) => {
              const config = getPromoConfig(promo.discountType);
              const usagePercent = (promo.usedCount / promo.maxUses) * 100;
              const remaining = promo.maxUses - promo.usedCount;
              return (
                <div
                  key={promo.id}
                  className="glass-card rounded-2xl border border-white/10 overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={`h-1 bg-gradient-to-r ${config.gradient}`}></div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-geometric-sm`}>
                          <span className="text-xl">{config.emoji}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base">{promo.title}</h3>
                            {promo.isNew && (
                              <span className="px-1.5 py-0.5 bg-pink-500/20 border border-pink-500/30 rounded-full text-xs font-bold text-pink-400">NEW</span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 mt-0.5">{promo.description}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 bg-gradient-to-r ${config.gradient} rounded-xl shadow-geometric-sm`}>
                        <span className="text-xs font-bold text-white">{promo.discount}</span>
                      </div>
                    </div>

                    {/* Code copy row */}
                    <div className={`flex items-center gap-3 p-3 glass rounded-xl border ${config.border} mb-3`}>
                      <div className="flex-1">
                        <p className="text-xs text-white/40 mb-0.5">Promo Code</p>
                        <p className="font-mono font-bold text-lg text-white tracking-widest">{promo.code}</p>
                      </div>
                      <button
                        onClick={() => handleCopyCode(promo.code)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-smooth press-scale ${
                          copiedCode === promo.code
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : `${config.bg} ${config.color} border ${config.border} hover:opacity-80`
                        }`}
                      >
                        <Icon name={copiedCode === promo.code ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={15} variant="outline" />
                        {copiedCode === promo.code ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Icon name="ClockIcon" size={12} className="text-amber-400" />
                        <span className="text-xs text-white/50">Until {promo.validUntil}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Icon name="CurrencyRupeeIcon" size={12} className="text-white/40" />
                        <span className="text-xs text-white/50">Min ₹{promo.minOrder || 'No min'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Icon name="TicketIcon" size={12} className="text-white/40" />
                        <span className="text-xs text-white/50">{remaining} left</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {promo.applicableServices.map(s => (
                          <span key={s} className="text-xs px-1.5 py-0.5 bg-white/10 rounded-full text-white/50">{s}</span>
                        ))}
                      </div>
                    </div>

                    {/* Usage bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/40">Usage</span>
                        <span className="text-xs text-white/40">{promo.usedCount}/{promo.maxUses}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-500`}
                          style={{ width: `${usagePercent}%` }}
                        ></div>
                      </div>
                      {remaining <= 20 && (
                        <p className="text-xs text-red-400 mt-1">⚠️ Only {remaining} uses remaining!</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REFERRAL TAB */}
        {activeTab === 'referral' && (
          <div className="space-y-4 animate-slide-up">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Earned', value: `₹${referralStats.totalEarned}`, icon: 'CurrencyRupeeIcon', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
                { label: 'Pending', value: `₹${referralStats.pendingRewards}`, icon: 'ClockIcon', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
                { label: 'Successful', value: referralStats.successfulReferrals, icon: 'CheckCircleIcon', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
                { label: 'Pending', value: referralStats.pendingReferrals, icon: 'UserGroupIcon', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
              ].map((stat, i) => (
                <div key={i} className={`glass-card rounded-2xl p-4 border ${stat.border} animate-slide-up`} style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-2`}>
                    <Icon name={stat.icon as any} size={18} className={stat.color} />
                  </div>
                  <p className={`font-bold text-xl ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Tier Progress */}
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Referral Tier</h3>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 ${currentTier.bg} border ${currentTier.border} rounded-full`}>
                  <span>{currentTier.emoji}</span>
                  <span className={`text-sm font-bold ${currentTier.color}`}>{referralStats.currentTier}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mb-3">
                {tiers.map((tier, i) => {
                  const tc = tierConfig[tier];
                  const isActive = tier === referralStats.currentTier;
                  const isPast = i < currentTierIndex;
                  return (
                    <div key={tier} className="flex-1 text-center">
                      <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1 border-2 transition-smooth ${
                        isActive ? `bg-gradient-to-br ${tc.gradient} border-transparent shadow-glow-purple` :
                        isPast ? `${tc.bg} ${tc.border}` : 'bg-white/5 border-white/10'
                      }`}>
                        <span className="text-lg">{tc.emoji}</span>
                      </div>
                      <p className={`text-xs font-semibold ${
                        isActive ? tc.color : isPast ? 'text-white/60' : 'text-white/30'
                      }`}>{tier}</p>
                      <p className="text-xs text-white/30">{tc.reward}</p>
                    </div>
                  );
                })}
              </div>
              {currentTierIndex < 3 && (
                <>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full bg-gradient-to-r ${currentTier.gradient} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min(100, progressToNext)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-white/40 text-center">
                    {referralStats.nextTierAt - referralStats.successfulReferrals} more referrals to reach {tiers[currentTierIndex + 1]}
                  </p>
                </>
              )}
            </div>

            {/* Referral Link */}
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <h3 className="font-bold text-white mb-1">Your Referral Link</h3>
              <p className="text-xs text-white/50 mb-4">Share this link and earn {currentTier.reward} for every successful signup</p>

              <div className="flex items-center gap-2 p-3 glass rounded-xl border border-purple-500/30 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/40 mb-0.5">Referral Code</p>
                  <p className="font-mono font-bold text-white text-sm truncate">{referralStats.referralCode}</p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-smooth press-scale flex-shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:opacity-80'
                  }`}
                >
                  <Icon name={copiedLink ? 'CheckIcon' : 'LinkIcon'} size={15} variant="outline" />
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* Share buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-green-500/15 border border-green-500/30 rounded-xl text-sm font-semibold text-green-400 hover:bg-green-500/25 transition-smooth press-scale"
                >
                  <span className="text-base">💬</span>
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-sky-500/15 border border-sky-500/30 rounded-xl text-sm font-semibold text-sky-400 hover:bg-sky-500/25 transition-smooth press-scale"
                >
                  <span className="text-base">🐦</span>
                  <span>Twitter</span>
                </button>
                <button
                  onClick={() => handleShare('email')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-orange-500/15 border border-orange-500/30 rounded-xl text-sm font-semibold text-orange-400 hover:bg-orange-500/25 transition-smooth press-scale"
                >
                  <span className="text-base">📧</span>
                  <span>Email</span>
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="glass-card rounded-2xl border border-white/10 p-5">
              <h3 className="font-bold text-white mb-4">Referral Analytics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Click-through Rate</span>
                    <span className="text-xs font-bold text-blue-400">{referralStats.clickThroughRate}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${referralStats.clickThroughRate}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Conversion Rate</span>
                    <span className="text-xs font-bold text-emerald-400">{referralStats.conversionRate}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full" style={{ width: `${referralStats.conversionRate}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50">Lifetime Earnings</p>
                  <p className="font-bold text-xl text-emerald-400">₹{referralStats.lifetimeEarnings}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50">Total Referrals</p>
                  <p className="font-bold text-xl text-white">{referralStats.successfulReferrals + referralStats.pendingReferrals}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEASONAL OFFERS TAB */}
        {activeTab === 'seasonal' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg text-white">Seasonal Offers</h2>
              <span className="text-xs text-white/50">Limited time deals</span>
            </div>
            {seasonalOffers.map((offer, index) => (
              <div
                key={offer.id}
                className="glass-card rounded-2xl border border-white/10 overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 0.07}s` }}
              >
                {/* Gradient banner */}
                <div className={`relative h-28 bg-gradient-to-r ${offer.gradient} flex items-center justify-between px-6 overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                  <div className="relative z-10">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white border border-white/30">{offer.badge}</span>
                    <h3 className="font-bold text-2xl text-white mt-2">{offer.title}</h3>
                  </div>
                  <div className="relative z-10 text-right">
                    <div className="text-5xl animate-bounce-in">{offer.emoji}</div>
                    <div className="mt-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                      <span className="text-sm font-bold text-white">{offer.discount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-sm text-white/70 mb-4 leading-relaxed">{offer.description}</p>

                  <div className="flex items-center gap-3 mb-4">
                    {offer.endsInMs > 0 && isHydrated && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/30 rounded-full">
                        <Icon name="ClockIcon" size={12} className="text-red-400" />
                        <span className="text-xs font-bold text-red-400">{formatCountdown(countdowns[offer.id] ?? offer.endsInMs)}</span>
                      </div>
                    )}
                    {offer.validUntil === 'Every Weekend' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-full">
                        <Icon name="CalendarIcon" size={12} className="text-blue-400" />
                        <span className="text-xs font-bold text-blue-400">Every Weekend</span>
                      </div>
                    )}
                    <span className="text-xs text-white/40">{offer.highlight}</span>
                  </div>

                  {/* Code copy */}
                  <div className="flex items-center gap-3 p-3 glass rounded-xl border border-white/20">
                    <div className="flex-1">
                      <p className="text-xs text-white/40 mb-0.5">Promo Code</p>
                      <p className="font-mono font-bold text-lg text-white tracking-widest">{offer.code}</p>
                    </div>
                    <button
                      onClick={() => handleCopyCode(offer.code)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-smooth press-scale ${
                        copiedCode === offer.code
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <Icon name={copiedCode === offer.code ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={15} variant="outline" />
                      {copiedCode === offer.code ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Upcoming offers teaser */}
            <div className="glass-card rounded-2xl border border-white/10 p-5 text-center">
              <div className="text-3xl mb-2">🔔</div>
              <h3 className="font-bold text-white mb-1">More Deals Coming Soon</h3>
              <p className="text-xs text-white/50 mb-3">Eid, Summer Sale, and End-of-Semester specials are on the way!</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-400 font-medium">Stay tuned for exclusive student deals</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
