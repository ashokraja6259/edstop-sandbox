// FILE: src/app/ai-companion-interface/components/SuggestedPrompts.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { IconProps } from '@/components/ui/AppIcon';

interface PromptCategory {
  id: string;
  name: string;
  icon: IconProps['name'];
  prompts: string[];
}

interface SuggestedPromptsProps {
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
}

const SuggestedPrompts = ({ onPromptSelect, disabled = false }: SuggestedPromptsProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('academic');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const categories: PromptCategory[] = [
    {
      id: 'academic',
      name: 'Academic Help',
      icon: 'AcademicCapIcon',
      prompts: [
        'Explain the concept of Big O notation in algorithms',
        'Help me understand quantum mechanics basics',
        'What are the key differences between supervised and unsupervised learning?',
        'Explain the working principle of a transformer in deep learning'
      ]
    },
    {
      id: 'campus',
      name: 'Campus Info',
      icon: 'BuildingLibraryIcon',
      prompts: [
        'What are the library timings?',
        'Tell me about campus facilities available',
        'How do I access the sports complex?',
        'What are the hostel mess timings?'
      ]
    },
    {
      id: 'general',
      name: 'General',
      icon: 'ChatBubbleLeftEllipsisIcon',
      prompts: [
        'Suggest a study schedule for exam preparation',
        'Tips for managing time effectively',
        'How to stay motivated during semester',
        'Best practices for group study sessions'
      ]
    }
  ];

  const activeCategory = categories.find(cat => cat.id === selectedCategory) || categories[0];

  if (!isHydrated) {
    return (
      <div className="bg-card border border-border rounded-md p-4">
        <h3 className="font-heading font-semibold text-sm text-foreground mb-3">
          Suggested Prompts
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md p-4 shadow-geometric">
      <h3 className="font-heading font-semibold text-sm text-foreground mb-3">
        Suggested Prompts
      </h3>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-sm whitespace-nowrap transition-smooth press-scale focus-ring ${
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-geometric-sm'
                : 'bg-muted text-text-secondary hover:bg-muted/80'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon name={category.icon} size={16} />
            <span className="font-caption text-xs font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {activeCategory.prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptSelect(prompt)}
            disabled={disabled}
            className={`w-full text-left p-3 bg-muted hover:bg-muted/80 rounded-sm transition-smooth hover-lift press-scale focus-ring ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <Icon name="LightBulbIcon" size={16} className="text-accent mt-0.5 flex-shrink-0" />
              <span className="font-body text-sm text-foreground leading-relaxed">
                {prompt}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedPrompts;