// FILE: src/app/ai-companion-interface/components/PremiumUpgradeModal.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PremiumUpgradeModal = ({ isOpen, onClose, onUpgrade }: PremiumUpgradeModalProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isOpen && isHydrated) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isHydrated]);

  if (!isOpen || !isHydrated) return null;

  const features = [
    {
      icon: 'ChatBubbleLeftRightIcon' as const,
      title: '50 Daily Questions',
      description: '10x more questions compared to free tier'
    },
    {
      icon: 'BoltIcon' as const,
      title: 'Priority Response',
      description: 'Faster AI response times for your queries'
    },
    {
      icon: 'SparklesIcon' as const,
      title: 'Advanced AI',
      description: 'Access to more powerful AI models'
    },
    {
      icon: 'BookmarkIcon' as const,
      title: 'Unlimited Bookmarks',
      description: 'Save and organize important conversations'
    },
    {
      icon: 'ClockIcon' as const,
      title: 'Extended History',
      description: 'Access chat history for up to 90 days'
    },
    {
      icon: 'ShieldCheckIcon' as const,
      title: 'Priority Support',
      description: 'Get help faster with dedicated support'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-md shadow-geometric-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-md shadow-geometric-sm">
                  <Icon name="SparklesIcon" size={24} variant="solid" className="text-accent-foreground" />
                </div>
                <h2 className="font-heading font-bold text-2xl text-foreground">
                  Upgrade to Premium
                </h2>
              </div>
              <p className="font-body text-sm text-text-secondary">
                Unlock the full potential of AI assistance
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-xs hover:bg-muted transition-smooth press-scale focus-ring"
              aria-label="Close modal"
            >
              <Icon name="XMarkIcon" size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-accent/10 border border-accent/20 rounded-md p-6 mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-heading font-bold text-4xl text-accent">₹199</span>
              <span className="font-caption text-sm text-text-secondary">/month</span>
            </div>
            <p className="font-body text-sm text-foreground">
              Special student pricing for IIT Kharagpur
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-muted rounded-sm"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xs shadow-geometric-sm flex-shrink-0">
                  <Icon name={feature.icon} size={20} variant="outline" className="text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-foreground mb-1">
                    {feature.title}
                  </h4>
                  <p className="font-body text-xs text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-success/10 border border-success/20 rounded-sm p-4 mb-6">
            <div className="flex items-start gap-2">
              <Icon name="CheckBadgeIcon" size={20} className="text-success mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-heading font-semibold text-sm text-success mb-1">
                  7-Day Money Back Guarantee
                </h4>
                <p className="font-body text-xs text-text-secondary leading-relaxed">
                  Not satisfied? Get a full refund within 7 days, no questions asked.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-muted text-foreground rounded-sm hover:bg-muted/80 transition-smooth press-scale focus-ring"
            >
              <span className="font-heading font-medium text-sm">Maybe Later</span>
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-sm hover:shadow-geometric-md transition-smooth press-scale focus-ring"
            >
              <span className="font-heading font-medium text-sm">Upgrade Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumUpgradeModal;