// FILE: src/app/ai-companion-interface/components/ChatMessage.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

const ChatMessage = ({ role, content, timestamp, isBookmarked = false, onBookmark }: ChatMessageProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] p-4 rounded-md ${
          role === 'user' ?'bg-primary text-primary-foreground' :'bg-card border border-border'
        }`}>
          <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[80%] relative ${
        role === 'user' ?'bg-primary text-primary-foreground' :'bg-card border border-border'
      } p-4 rounded-md shadow-geometric`}>
        {role === 'assistant' && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
            <div className="flex items-center justify-center w-6 h-6 bg-accent rounded-xs">
              <Icon name="SparklesIcon" size={14} variant="solid" className="text-accent-foreground" />
            </div>
            <span className="font-caption text-xs font-medium text-accent">AI Assistant</span>
          </div>
        )}
        
        <p className={`font-body text-sm leading-relaxed whitespace-pre-wrap ${
          role === 'user' ? 'text-primary-foreground' : 'text-foreground'
        }`}>
          {content}
        </p>
        
        <div className={`flex items-center justify-between mt-3 pt-2 border-t ${
          role === 'user' ? 'border-primary-foreground/20' : 'border-border'
        }`}>
          <span className={`font-caption text-xs ${
            role === 'user' ? 'text-primary-foreground/70' : 'text-text-secondary'
          }`}>
            {timestamp}
          </span>
          
          {showActions && role === 'assistant' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onBookmark}
                className="flex items-center justify-center w-7 h-7 rounded-xs hover:bg-muted transition-smooth press-scale focus-ring"
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
              >
                <Icon 
                  name="BookmarkIcon" 
                  size={16} 
                  variant={isBookmarked ? 'solid' : 'outline'}
                  className={isBookmarked ? 'text-accent' : 'text-muted-foreground'}
                />
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(content)}
                className="flex items-center justify-center w-7 h-7 rounded-xs hover:bg-muted transition-smooth press-scale focus-ring"
                aria-label="Copy message"
              >
                <Icon name="ClipboardDocumentIcon" size={16} className="text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;