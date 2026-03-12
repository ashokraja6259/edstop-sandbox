// FILE: src/app/student-dashboard/components/StudentDashboardInteractive.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import WalletSection from './WalletSection';
import ServicesGrid from './ServicesGrid';
import ActiveOrdersSection from './ActiveOrdersSection';
import OffersSection from './OffersSection';
import QuickStatsCard from './QuickStatsCard';
import AICompanionCard from './AICompanionCard';
import Icon from '@/components/ui/AppIcon';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import Link from 'next/link';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useRealtimeChannels } from '@/hooks/useRealtimeChannels';
import { useAICompanionRealtime } from '@/hooks/useAICompanionRealtime';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'expired';
}

interface Service {
  id: string;
  title: string;
  description: string;
  icon: 'ShoppingBagIcon' | 'ShoppingCartIcon' | 'SparklesIcon';
  href: string;
  badge?: string;
  isActive: boolean;
  activeOrderCount: number;
}

interface OrderStatus {
  id: string;
  serviceName: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  estimatedTime?: string;
  orderNumber: string;
  icon: 'ShoppingBagIcon' | 'ShoppingCartIcon';
}

interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  discount: string;
  validUntil: string;
  image: string;
  alt: string;
  type: 'cashback' | 'discount' | 'free-delivery';
  minOrder?: number;
}

interface Stat {
  label: string;
  value: string;
  icon: 'ShoppingBagIcon' | 'CurrencyRupeeIcon' | 'StarIcon' | 'TruckIcon';
  color: 'primary' | 'success' | 'accent' | 'warning';
}

const StudentDashboardInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [authBootTimeout, setAuthBootTimeout] = useState(false);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Connect Supabase real-time channels for order, delivery, and wallet updates
  const { walletBalance: liveBalance, cashbackEarned: liveCashback, activeOrders: liveOrders, recentTransactions: liveTransactions, isLoading: isDataLoading, isLive } = useRealtimeChannels(user?.id);

  // Connect Supabase real-time listener for AI usage (questions remaining, premium status)
  const { questionsUsed: liveQuestionsUsed, questionsLimit: liveQuestionsLimit, isPremium: liveIsPremium, isLoading: isAILoading } = useAICompanionRealtime(user?.id, 0, false);

  const { retry, manualRetry, reset, isRetrying, retryCount, nextRetryIn, maxRetriesReached } = useRetry({
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: async () => {
      setHasError(false);
      setIsOffline(false);
    },
  });


  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const timer = setTimeout(() => setAuthBootTimeout(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setIsHydrated(true);
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const greet = hours < 12 ? 'Good Morning' : hours < 17 ? 'Good Afternoon' : 'Good Evening';
      setCurrentTime(greet);
      setGreeting(hours < 12 ? '🌅' : hours < 17 ? '☀️' : '🌙');
    };
    updateTime();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOffline(false);
      reset();
      setHasError(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setHasError(true);
      retry();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [retry, reset]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.info('Signed out', 'You have been logged out successfully');
      router.push('/login');
    } catch (error: any) {
      console.error('Logout error:', error?.message);
      toast.error('Logout failed', 'Please try again');
    }
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ');
      return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'SK';
  };

  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    return 'Scholar';
  };

  const walletBalance = liveBalance ?? 1250.50;
  const cashbackEarned = liveCashback > 0 ? liveCashback : 62.75;

  const recentTransactions = liveTransactions.length > 0 ? liveTransactions : [
    { id: 'txn001', type: 'credit' as const, amount: 25.00, description: 'Cashback from Food Order', date: '23/02/2026', status: 'completed' as const },
    { id: 'txn002', type: 'debit' as const, amount: 150.00, description: 'Dark Store Purchase', date: '22/02/2026', status: 'completed' as const },
    { id: 'txn003', type: 'credit' as const, amount: 500.00, description: 'Wallet Recharge', date: '20/02/2026', status: 'completed' as const },
  ];

  const services: Service[] = [
    {
      id: 'food-delivery',
      title: 'Food Delivery',
      description: 'Order from campus restaurants with free delivery above ₹399. Minimum order ₹149.',
      icon: 'ShoppingBagIcon',
      href: '/food-ordering-interface',
      badge: 'Free Delivery ₹399+',
      isActive: true,
      activeOrderCount: 1,
    },
    {
      id: 'dark-store',
      title: 'Dark Store Shopping',
      description: 'Quick essentials delivery with free shipping. Minimum order ₹99.',
      icon: 'ShoppingCartIcon',
      href: '/dark-store-shopping',
      badge: 'Free Delivery',
      isActive: true,
      activeOrderCount: 0,
    },
  ];

  const activeOrders = liveOrders.length > 0 ? liveOrders : [
    { id: 'ord001', serviceName: 'Food Delivery', status: 'preparing' as const, estimatedTime: '25 mins', orderNumber: 'FD2402240001', icon: 'ShoppingBagIcon' as const },
  ];

  const offers: Offer[] = [
    {
      id: 'offer001',
      title: '5% Cashback on All Orders',
      description: 'Get 5% cashback on subtotal for every order. Valid for 60 days.',
      code: 'EDCASH5',
      discount: '5% Cashback',
      validUntil: '24/04/2026',
      image: 'https://img.rocket.new/generatedImages/rocket_gen_img_17cbf357e-1767195657585.png',
      alt: 'Colorful cashback offer banner with percentage symbols and coins on gradient background',
      type: 'cashback',
      minOrder: 149,
    },
    {
      id: 'offer002',
      title: 'Free Delivery Weekend',
      description: 'Enjoy free delivery on all food orders this weekend.',
      code: 'WEEKEND',
      discount: 'Free Delivery',
      validUntil: '25/02/2026',
      image: 'https://images.unsplash.com/photo-1637732697141-58806b8f011d',
      alt: 'Delivery person on scooter with food packages against blue sky background',
      type: 'free-delivery',
      minOrder: 0,
    },
  ];

  const stats: Stat[] = [
    { label: 'Total Orders', value: '47', icon: 'ShoppingBagIcon', color: 'primary' },
    { label: 'Total Spent', value: '₹8,450', icon: 'CurrencyRupeeIcon', color: 'success' },
    { label: 'Cashback Earned', value: `₹${cashbackEarned.toFixed(0)}`, icon: 'StarIcon', color: 'accent' },
    { label: 'Active Orders', value: String(activeOrders.length), icon: 'TruckIcon', color: 'warning' },
  ];

  if (loading || (!user && isHydrated)) {
    return (
      <div className="min-h-screen gradient-mesh">
        <div className="container mx-auto px-4 py-8">
          {authBootTimeout ? (
            <div className="max-w-lg rounded-2xl glass-card p-6 text-center">
              <h2 className="text-lg font-semibold text-white">Still loading your dashboard…</h2>
              <p className="mt-2 text-sm text-white/70">If this takes too long, go to login and try again.</p>
              <button
                onClick={() => router.replace('/login')}
                className="mt-4 inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <div className="animate-pulse space-y-6">
              <div className="h-16 bg-white/5 rounded-2xl"></div>
              <div className="h-48 bg-white/5 rounded-3xl"></div>
              <div className="h-64 bg-white/5 rounded-2xl"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen gradient-mesh">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-16 bg-white/5 rounded-2xl"></div>
            <div className="h-48 bg-white/5 rounded-3xl"></div>
            <div className="h-64 bg-white/5 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh dot-pattern">
      {/* Floating orbs background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-500/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow-purple animate-glow-pulse">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-background animate-ping-slow"></div>
              </div>
              <div>
                <span className="font-bold text-xl text-white tracking-tight">Ed<span className="text-purple-400">Stop</span></span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-purple-300/70 font-medium">IIT Kharagpur</span>
                  <span className="text-xs">🎓</span>
                </div>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => alert('Notifications coming soon!')}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl glass hover:bg-white/10 transition-smooth press-scale focus-ring"
              >
                <Icon name="BellIcon" size={20} variant="outline" className="text-white/80" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-background animate-pulse"></span>
              </button>

              <div
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass hover:bg-white/10 transition-smooth press-scale cursor-pointer"
              >
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-glow-purple">
                  <span className="font-bold text-xs text-white">{getUserInitials()}</span>
                </div>
                <Icon name="ChevronDownIcon" size={14} className="text-white/60" />
              </div>

              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 glass-strong rounded-2xl border border-white/10 py-2 z-50 animate-slide-up shadow-soft-xl">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-white">{user?.user_metadata?.full_name || 'Student'}</p>
                    <p className="text-xs text-white/50 truncate">{user?.email}</p>
                  </div>
                  <Link href="/wallet" className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Icon name="WalletIcon" size={16} className="text-purple-400" />
                    <span>My Wallet</span>
                  </Link>
                  <Link href="/order-history" className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Icon name="ClipboardDocumentListIcon" size={16} className="text-indigo-400" />
                    <span>Order History</span>
                  </Link>
                  <Link href="/student-profile" className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Icon name="UserCircleIcon" size={16} className="text-purple-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link href="/promotions" className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Icon name="TagIcon" size={16} className="text-pink-400" />
                    <span>Promotions</span>
                  </Link>
                  <Link href="/promotions-analytics-dashboard" className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Icon name="ChartBarIcon" size={16} className="text-cyan-400" />
                    <span>Promo Analytics</span>
                  </Link>
                  <Link href="/admin-promo-code-management" className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Icon name="ShieldCheckIcon" size={16} className="text-indigo-400" />
                    <span>Admin: Promo Codes</span>
                  </Link>
                  <Link href="/account-deletion" className="w-full text-left px-4 py-2.5 text-sm text-red-400/80 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                    <Icon name="TrashIcon" size={16} className="text-red-400" />
                    <span>Delete Account</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <Icon name="ArrowRightOnRectangleIcon" size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6">
        {/* Network Error Banner */}
        {isOffline && (
          <div className="mb-6 animate-slide-up">
            <ErrorFallback
              type="network"
              onRetry={() => { manualRetry(true); }}
              variant="minimal"
              isRetrying={isRetrying}
              retryCount={retryCount}
              nextRetryIn={nextRetryIn}
              maxRetriesReached={maxRetriesReached}
              autoRetryEnabled={true}
            />
          </div>
        )}

        {/* Hero Section */}
        <div className="relative mb-8 p-8 rounded-3xl overflow-hidden animate-slide-up">
          <div className="absolute inset-0 gradient-hero opacity-90"></div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.9) 0%, rgba(79,70,229,0.85) 40%, rgba(236,72,153,0.8) 100%)' }}></div>
          {/* Animated shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 animate-spin-slow"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 animate-float"></div>
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-pink-400/10 rounded-full blur-xl animate-float-slow"></div>

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{greeting}</span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white border border-white/30">
                    🏛️ IIT KGP Campus
                  </span>
                </div>
                <h1 className="font-bold text-4xl md:text-5xl text-white mb-2 leading-tight">
                  {currentTime},<br />
                  <span className="text-yellow-300">{getUserName()}!</span>
                </h1>
                <p className="text-white/80 text-lg font-medium">
                  Your campus commerce hub is ready 🚀
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/20">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white font-medium">All services live</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/20">
                    <span className="text-xs text-white font-medium">⚡ Fast delivery</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end gap-2">
                <div className="glass rounded-2xl p-4 border border-white/20 animate-bounce-in">
                  <p className="text-xs text-white/70 mb-1">Wallet Balance</p>
                  {isDataLoading && liveBalance === null ? (
                    <div className="h-8 w-24 bg-white/20 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-white">₹{walletBalance.toFixed(0)}</p>
                  )}
                  <p className="text-xs text-green-300">+₹{cashbackEarned.toFixed(2)} cashback</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <QuickStatsCard stats={stats} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Services */}
            <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1 h-6 gradient-primary rounded-full inline-block"></span>
                  Campus Services
                </h2>
                <span className="text-xs text-purple-300 font-medium bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  {services.filter(s => s.isActive).length} active
                </span>
              </div>
              {services.length === 0 && !isDataLoading ? (
                <EmptyState
                  icon="🏪"
                  title="No services available"
                  description="Campus services are currently unavailable. Check back soon!"
                  variant="minimal"
                />
              ) : (
                <ServicesGrid
                  services={services}
                  isLoading={isDataLoading && liveOrders.length === 0}
                  hasError={hasError && maxRetriesReached}
                  onRetry={() => manualRetry(true)}
                />
              )}
            </div>

            {/* Active Orders */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <ActiveOrdersSection
                orders={activeOrders}
                isLoading={isDataLoading && liveOrders.length === 0}
                hasError={hasError && maxRetriesReached && !isOffline}
                onRetry={() => manualRetry(true)}
              />
            </div>

            {/* Info Card */}
            <div className="glass-card rounded-2xl p-6 border border-purple-500/20 animate-slide-up" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 gradient-primary rounded-xl shadow-glow-purple flex-shrink-0">
                  <Icon name="InformationCircleIcon" size={24} variant="solid" className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-3">📋 Campus Policy</h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      'Cash on Delivery available up to ₹800 (no cashback/wallet redemption)',
                      'Redeem up to 30% of order value using EdCoins',
                      'Cashback expires after 60 days from credit date',
                      'Single restaurant per food order policy applies',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Icon name="CheckCircleIcon" size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-white/70">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
              <WalletSection
                balance={walletBalance}
                cashbackEarned={cashbackEarned}
                recentTransactions={recentTransactions}
                isLoading={isDataLoading && liveBalance === null}
              />
            </div>
            <div className="animate-slide-in-right" style={{ animationDelay: '0.15s' }}>
              <AICompanionCard
                freeQuestionsRemaining={3}
                totalFreeQuestions={5}
                isPremium={false}
                isLoading={isAILoading}
              />
            </div>
            <div className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
              <OffersSection offers={offers} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 glass-strong border-t border-white/10 mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-glow-purple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm text-white">Ed<span className="text-purple-400">Stop</span></p>
                <p className="text-xs text-white/40">IIT Kharagpur Campus Commerce</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-white/30">© {new Date().getFullYear()} EdStop. Built with ❤️ for KGPians</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentDashboardInteractive;