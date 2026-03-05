// FILE: src/app/ai-companion-interface/components/AICompanionInteractive.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import HeaderBrand from '@/components/common/HeaderBrand';
import WalletIndicator from '@/components/common/WalletIndicator';
import Icon from '@/components/ui/AppIcon';
import ChatMessage from './ChatMessage';
import QuestionCounter from './QuestionCounter';
import SuggestedPrompts from './SuggestedPrompts';
import ChatHistory from './ChatHistory';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import EmptyState from '@/components/ui/EmptyState';
import ErrorFallback from '@/components/ui/ErrorFallback';
import { useRetry } from '@/hooks/useRetry';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAICompanionRealtime } from '@/hooks/useAICompanionRealtime';
import { supabase } from '@/lib/supabaseClient'; // ✅ FIXED

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isBookmarked: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messageCount: number;
  isBookmarked: boolean;
}

const AICompanionInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState('session-1');
  const [hasApiError, setHasApiError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  const {
    questionsUsed,
    questionsLimit,
    isPremium,
    isLoading: usageLoading,
    isLive,
  } = useAICompanionRealtime(user?.id, 3, false);

  const questionsRemaining = questionsLimit - questionsUsed;

  const { retry: autoRetry, manualRetry, reset: resetRetry, isRetrying, retryCount, nextRetryIn, maxRetriesReached } = useRetry({
    maxRetries: 3,
    baseDelay: 1500,
    onRetry: async () => {
      if (lastUserMessage) {
        setHasApiError(false);
        await sendMessageToAI(lastUserMessage);
      }
    },
  });

  const toast = useToast();

  useEffect(() => {
    setIsHydrated(true);

    setMessages([
      {
        id: 'msg-1',
        role: 'assistant',
        content:
          "Hello! I'm your AI companion for IIT Kharagpur.\n\nHow can I assist you today?",
        timestamp: 'Today',
        isBookmarked: false,
      },
    ]);
  }, []);

  useEffect(() => {
    if (isHydrated && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isHydrated]);

  const sendMessageToAI = async (messageContent: string) => {
    setIsLoading(true);
    setHasApiError(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const aiResponse: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content:
            "Thanks for your question.\n\nHere is a structured explanation:\n\n1. Concept clarity\n2. Practical angle\n3. Actionable advice\n\nWant me to go deeper?",
          timestamp: 'Just now',
          isBookmarked: false,
        };

        setMessages((prev) => [...prev, aiResponse]);
        setIsLoading(false);
        resetRetry();
        resolve();
      }, 1500);
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (questionsRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: 'Just now',
      isBookmarked: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLastUserMessage(inputValue);
    setInputValue('');

    if (user?.id) {
      try {
        await supabase.from('ai_usage').upsert(
          {
            user_id: user.id,
            questions_used: questionsUsed + 1,
            questions_limit: questionsLimit,
            is_premium: isPremium,
            last_reset_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch {}
    }

    try {
      await sendMessageToAI(inputValue);
    } catch {
      setHasApiError(true);
      setIsLoading(false);
      autoRetry();
    }
  };

  const handleUpgrade = async () => {
    setShowUpgradeModal(false);

    if (user?.id) {
      try {
        await supabase.from('ai_usage').upsert(
          {
            user_id: user.id,
            questions_used: questionsUsed,
            questions_limit: 50,
            is_premium: true,
            last_reset_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch {}
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <HeaderBrand showBackButton />
          <WalletIndicator balance={1250.5} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="glass-neon rounded-2xl flex flex-col h-[70vh]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                isBookmarked={message.isBookmarked}
                onBookmark={() => {}}
              />
            ))}

            {isLoading && <div className="text-sm text-muted">AI thinking...</div>}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-card border border-border"
                placeholder="Ask anything..."
              />
              <button
                onClick={handleSendMessage}
                className="px-6 py-3 bg-primary text-white rounded-xl"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>

      {showUpgradeModal && (
        <PremiumUpgradeModal
          isOpen={showUpgradeModal}
          onUpgrade={handleUpgrade}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

export default AICompanionInteractive;