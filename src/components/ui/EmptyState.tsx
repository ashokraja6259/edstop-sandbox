// FILE: src/components/ui/EmptyState.tsx

'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: 'default' | 'glass' | 'minimal';
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  variant = 'glass',
}: EmptyStateProps) {
  const containerClass =
    variant === 'glass' ?'glass-neon rounded-2xl border border-primary/20'
      : variant === 'minimal' ?'rounded-2xl border border-white/10 bg-white/5' :'rounded-2xl bg-card border border-border';

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${containerClass} ${className}`}
    >
      <div className="text-6xl mb-5 animate-float select-none">{icon}</div>
      <h3 className="font-heading font-bold text-xl text-foreground mb-2">{title}</h3>
      {description && (
        <p className="font-body text-sm text-text-secondary max-w-xs leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-heading font-semibold text-sm rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 press-scale btn-glow"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
