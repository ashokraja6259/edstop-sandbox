// FILE: src/components/ui/ErrorFallback.tsx

'use client';



interface ErrorFallbackProps {
  type?: 'api' | 'network' | 'generic';
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'glass' | 'card' | 'minimal';
  // Retry state props
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  nextRetryIn?: number;
  maxRetriesReached?: boolean;
  autoRetryEnabled?: boolean;
}

const ERROR_CONFIGS = {
  api: {
    icon: '⚠️',
    title: 'Something went wrong',
    description: 'We couldn\'t load the data. Please try again.',
  },
  network: {
    icon: '📡',
    title: 'No connection',
    description: 'Check your internet connection and try again.',
  },
  generic: {
    icon: '🔧',
    title: 'Oops! An error occurred',
    description: 'Something unexpected happened. Please try again.',
  },
};

export default function ErrorFallback({
  type = 'generic',
  title,
  description,
  onRetry,
  className = '',
  variant = 'glass',
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  nextRetryIn = 0,
  maxRetriesReached = false,
  autoRetryEnabled = false,
}: ErrorFallbackProps) {
  const config = ERROR_CONFIGS[type];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  const containerClass =
    variant === 'glass' ?'glass-neon rounded-2xl border border-red-500/20'
      : variant === 'card' ?'rounded-2xl bg-card border border-border' :'rounded-2xl border border-white/10 bg-white/5';

  const attemptsLeft = maxRetries - retryCount;

  return (
    <div
      className={`flex flex-col items-center justify-center py-14 px-6 text-center ${containerClass} ${className}`}
    >
      <div className={`w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-5 ${isRetrying ? 'animate-spin' : 'animate-float'}`}>
        {isRetrying ? (
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <span className="text-3xl select-none">{config.icon}</span>
        )}
      </div>

      <h3 className="font-heading font-bold text-xl text-foreground mb-2">
        {isRetrying ? 'Retrying...' : displayTitle}
      </h3>
      <p className="font-body text-sm text-text-secondary max-w-xs leading-relaxed">
        {isRetrying
          ? nextRetryIn > 0
            ? `Retrying in ${nextRetryIn}s... (attempt ${retryCount + 1}/${maxRetries})`
            : `Attempting to reconnect... (${retryCount + 1}/${maxRetries})`
          : displayDescription}
      </p>

      {/* Retry attempt indicator */}
      {retryCount > 0 && !isRetrying && (
        <div className="mt-3 flex items-center gap-1.5">
          {Array.from({ length: maxRetries }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < retryCount
                  ? 'bg-red-500' :'bg-white/20'
              }`}
            />
          ))}
          <span className="ml-1 font-caption text-xs text-text-secondary">
            {maxRetriesReached ? 'All retries failed' : `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} left`}
          </span>
        </div>
      )}

      {/* Auto-retry countdown bar */}
      {isRetrying && nextRetryIn > 0 && (
        <div className="mt-4 w-full max-w-xs">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-1000"
              style={{ width: `${((maxRetries - nextRetryIn / 5) / maxRetries) * 100}%` }}
            />
          </div>
        </div>
      )}

      {onRetry && !isRetrying && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600/80 to-rose-600/80 text-white font-heading font-semibold text-sm rounded-xl border border-red-500/30 hover:from-red-600 hover:to-rose-600 transition-all duration-300 press-scale shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {maxRetriesReached ? 'Try Again' : 'Retry Now'}
          </button>
          {autoRetryEnabled && !maxRetriesReached && (
            <p className="font-caption text-xs text-text-secondary/60">Auto-retry with exponential backoff enabled</p>
          )}
        </div>
      )}
    </div>
  );
}
