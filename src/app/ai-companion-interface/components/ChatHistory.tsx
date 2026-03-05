// FILE: src/app/ai-companion-interface/components/ChatHistory.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messageCount: number;
  isBookmarked: boolean;
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  currentSessionId?: string;
}

const ChatHistory = ({ sessions, onSessionSelect, onSessionDelete, currentSessionId }: ChatHistoryProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="bg-card border border-border rounded-md p-4">
        <h3 className="font-heading font-semibold text-base text-foreground mb-4">
          Chat History
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBookmark = !showBookmarkedOnly || session.isBookmarked;
    return matchesSearch && matchesBookmark;
  });

  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const date = session.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  return (
    <div className="bg-card border border-border rounded-md p-4 shadow-geometric">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-base text-foreground">
          Chat History
        </h3>
        <button
          onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
          className={`flex items-center justify-center w-8 h-8 rounded-xs transition-smooth press-scale focus-ring ${
            showBookmarkedOnly ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
          }`}
          aria-label="Toggle bookmarked only"
        >
          <Icon name="BookmarkIcon" size={18} variant={showBookmarkedOnly ? 'solid' : 'outline'} />
        </button>
      </div>

      <div className="relative mb-4">
        <Icon 
          name="MagnifyingGlassIcon" 
          size={18} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-sm font-body text-sm text-foreground placeholder:text-text-secondary focus:outline-none focus-ring transition-smooth"
        />
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {Object.entries(groupedSessions).length === 0 ? (
          <div className="text-center py-8">
            <Icon name="ChatBubbleLeftRightIcon" size={48} className="text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-sm text-text-secondary">
              {searchQuery || showBookmarkedOnly ? 'No conversations found' : 'No chat history yet'}
            </p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([date, dateSessions]) => (
            <div key={date}>
              <h4 className="font-caption text-xs font-medium text-text-secondary mb-2 px-2">
                {date}
              </h4>
              <div className="space-y-2">
                {dateSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative p-3 rounded-sm transition-smooth hover-lift cursor-pointer ${
                      currentSessionId === session.id
                        ? 'bg-primary/10 border border-primary' :'bg-muted hover:bg-muted/80 border border-transparent'
                    }`}
                    onClick={() => onSessionSelect(session.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-heading font-medium text-sm text-foreground truncate">
                            {session.title}
                          </h5>
                          {session.isBookmarked && (
                            <Icon name="BookmarkIcon" size={14} variant="solid" className="text-accent flex-shrink-0" />
                          )}
                        </div>
                        <p className="font-caption text-xs text-text-secondary">
                          {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSessionDelete(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-xs hover:bg-destructive/10 transition-smooth press-scale focus-ring"
                        aria-label="Delete conversation"
                      >
                        <Icon name="TrashIcon" size={16} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistory;