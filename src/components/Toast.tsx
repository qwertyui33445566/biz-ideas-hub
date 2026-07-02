import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface ToastContextValue {
  show: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full text-sm font-medium',
          'bg-card border border-border shadow-xl backdrop-blur-xl',
          'transition-all duration-300 pointer-events-none',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
