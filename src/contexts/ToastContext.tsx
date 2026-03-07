// FILE: src/contexts/ToastContext.tsx

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, ToastItem, ToastType } from '@/components/ui/Toast';

interface ShowToastOptions {
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, options: ShowToastOptions | string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, options: ShowToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, ...opts }]);
  }, []);

  const success = useCallback((title: string, message?: string) => showToast('success', { title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast('error', { title, message }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast('warning', { title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast('info', { title, message }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export default ToastContext;
