// FILE: src/app/student-dashboard/components/AICompanionCard.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface AICompanionCardProps {
  freeQuestionsRemaining: number;
  totalFreeQuestions: number;
  isPremium: boolean;
  premiumQuestionsRemaining?: number;
  isLoading?: boolean;
}

const AICompanionCard = ({
  freeQuestionsRemaining,
  totalFreeQuestions,
  isPremium,
  premiumQuestionsRemaining = 0,
  isLoading = false,
}: AICompanionCardProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [animateBar, setAnimateBar] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const timer = setTimeout(() => setAnimateBar(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!isHydrated) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-purple-500/20">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-2/3"></div>
          <div className="h-20 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative glass-card rounded-2xl overflow-hidden border border-purple-500/30">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(236,72,153,0.15) 100%)' }}></div>
        <div className="relative z-10 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="animate-pulse w-12 h-12 bg-white/15 rounded-xl"></div>
            <div className="space-y-2">
              <div className="animate-pulse h-4 bg-white/15 rounded w-28"></div>
              <div className="animate-pulse h-3 bg-white/10 rounded w-20"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="animate-pulse flex justify-between">
              <div className="h-3 bg-white/10 rounded w-32"></div>
              <div className="h-3 bg-white/10 rounded w-12"></div>
            </div>
            <div className="animate-pulse h-2.5 bg-white/10 rounded-full w-full"></div>
          </div>
          <div className="animate-pulse h-3 bg-white/10 rounded w-full"></div>
          <div className="animate-pulse h-3 bg-white/10 rounded w-4/5"></div>
          <div className="animate-pulse h-11 bg-white/15 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  const questionsRemaining = isPremium ? premiumQuestionsRemaining : freeQuestionsRemaining;
  const totalQuestions = isPremium ? 50 : totalFreeQuestions;
  const percentage = (questionsRemaining / totalQuestions) * 100;

  return (
    <div className="relative glass-card rounded-2xl overflow-hidden border border-purple-500/30">
      {/* Animated background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(236,72,153,0.15) 100%)' }}></div>
      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full -mr-20 -mt-20 animate-spin-slow"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full -ml-16 -mb-16 animate-float"></div>

      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Animated AI orb */}
            <div className="relative">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow-purple animate-glow-pulse">
                <Icon name="SparklesIcon" size={24} variant="solid" className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full border-2 border-background flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">AI Companion</h3>
              <p className="text-xs text-purple-300">
                {isPremium ? '⭐ Premium Access' : '🆓 Free Tier'}
              </p>
            </div>
          </div>
          {isPremium && (
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
              PRO
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/70">Questions Remaining</span>
            <span className="text-sm font-bold text-white">
              {questionsRemaining}<span className="text-white/40">/{totalQuestions}</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: animateBar ? `${percentage}%` : '0%',
                background: percentage > 50
                  ? 'linear-gradient(90deg, #7C3AED, #A855F7)'
                  : percentage > 20
                  ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                  : 'linear-gradient(90deg, #EF4444, #DC2626)',
                boxShadow: `0 0 10px ${percentage > 50 ? 'rgba(124,58,237,0.6)' : 'rgba(239,68,68,0.6)'}`,
              }}
            ></div>
          </div>
        </div>

        <p className="text-sm text-white/70 mb-5 leading-relaxed">
          Get instant answers to campus queries, academic doubts & more with AI. 🧠
        </p>

        <div className="flex gap-3">
          <Link
            href="/ai-companion-interface"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 gradient-primary text-white rounded-xl shadow-glow-purple hover-lift transition-smooth press-scale focus-ring font-semibold text-sm"
          >
            <Icon name="ChatBubbleLeftRightIcon" size={16} variant="solid" />
            Start Chat
          </Link>
          {!isPremium && (
            <button
              onClick={() => alert('Premium upgrade coming soon!')}
              className="px-4 py-3 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 hover:bg-amber-500/30 transition-smooth press-scale"
            >
              <Icon name="ArrowUpIcon" size={16} variant="solid" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICompanionCard;