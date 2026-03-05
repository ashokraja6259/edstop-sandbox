// FILE: src/components/ui/Toast.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const toastConfig: Record<ToastType, { icon: string; bg: string; border: string; iconColor: string; titleColor: string }> = {
  success: {
    icon: 'CheckCircleIcon',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-300',
  },
  error: {
    icon: 'XCircleIcon',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    titleColor: 'text-red-300',
  },
  warning: {
    icon: 'ExclamationTriangleIcon',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
  },
  info: {
    icon: 'InformationCircleIcon',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-300',
  },
};

const ToastSingle = ({ toast, onDismiss }: ToastProps) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const config = toastConfig[toast.type];
  const duration = toast.duration ?? 4000;

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => dismiss(), duration);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [duration, dismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg
        max-w-sm w-full pointer-events-auto cursor-pointer
        transition-all duration-300 ease-out
        ${config.bg} ${config.border}
        ${visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
      onClick={dismiss}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon name={config.icon as any} size={20} className={config.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${config.titleColor}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{toast.message}</p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss notification"
      >
        <Icon name="XMarkIcon" size={16} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer = ({ toasts, onDismiss }: ToastContainerProps) => {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastSingle key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastSingle;
