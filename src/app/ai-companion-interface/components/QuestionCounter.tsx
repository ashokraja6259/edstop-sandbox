// FILE: src/app/ai-companion-interface/components/QuestionCounter.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface QuestionCounterProps {
  questionsUsed: number;
  questionsLimit: number;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

const QuestionCounter = ({ questionsUsed, questionsLimit, isPremium, onUpgradeClick }: QuestionCounterProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const questionsRemaining = questionsLimit - questionsUsed;
  const usagePercentage = (questionsUsed / questionsLimit) * 100;
  const isLowQuestions = questionsRemaining <= 2 && !isPremium;

  if (!isHydrated) {
    return (
      <div className="bg-card border border-border rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-caption text-sm text-text-secondary">Daily Questions</span>
          <span className="font-data text-lg font-semibold text-foreground">
            {questionsRemaining}/{questionsLimit}
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-smooth"
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border rounded-md p-4 shadow-geometric ${
      isLowQuestions ? 'border-warning' : 'border-border'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon 
            name={isPremium ? 'SparklesIcon' : 'ChatBubbleLeftRightIcon'} 
            size={18} 
            variant={isPremium ? 'solid' : 'outline'}
            className={isPremium ? 'text-accent' : 'text-primary'}
          />
          <span className="font-caption text-sm text-text-secondary">
            {isPremium ? 'Premium Questions' : 'Daily Questions'}
          </span>
        </div>
        <span className={`font-data text-lg font-semibold ${
          isLowQuestions ? 'text-warning' : 'text-foreground'
        }`}>
          {questionsRemaining}/{questionsLimit}
        </span>
      </div>
      
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full transition-smooth ${
            isLowQuestions ? 'bg-warning' : isPremium ? 'bg-accent' : 'bg-primary'
          }`}
          style={{ width: `${usagePercentage}%` }}
        />
      </div>

      {isLowQuestions && (
        <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-sm mb-3">
          <Icon name="ExclamationTriangleIcon" size={16} className="text-warning mt-0.5" />
          <p className="font-caption text-xs text-warning leading-relaxed">
            Only {questionsRemaining} {questionsRemaining === 1 ? 'question' : 'questions'} remaining today. Upgrade to Premium for 50 daily questions!
          </p>
        </div>
      )}

      {!isPremium && (
        <button
          onClick={onUpgradeClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-sm hover:shadow-geometric-md transition-smooth press-scale focus-ring"
        >
          <Icon name="SparklesIcon" size={16} variant="solid" />
          <span className="font-heading font-medium text-sm">Upgrade to Premium</span>
        </button>
      )}

      {isPremium && (
        <div className="flex items-center justify-center gap-2 p-2 bg-accent/10 rounded-sm">
          <Icon name="CheckBadgeIcon" size={16} className="text-accent" />
          <span className="font-caption text-xs text-accent font-medium">Premium Active</span>
        </div>
      )}
    </div>
  );
};

export default QuestionCounter;