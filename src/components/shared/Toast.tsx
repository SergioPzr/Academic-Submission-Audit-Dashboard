import { useState, useEffect, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  icon?: string;
  onClose: () => void;
  duration?: number;
}

export function showToast(
  setter: (t: { message: string; type: 'success' | 'error' | 'info'; icon: string } | null) => void,
  message: string,
  type: 'success' | 'error' | 'info' = 'success',
  icon = '✅'
) {
  setter({ message, type, icon });
}

const icons: Record<string, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
};

export function ToastContainer({
  toast,
  onClose,
}: {
  toast: { message: string; type: 'success' | 'error' | 'info'; icon: string } | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 200);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const bgMap = { success: 'bg-navy', error: 'bg-red', info: 'bg-navy-mid' };

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg flex items-center gap-2.5 transition-all duration-200 max-w-xs',
        bgMap[toast.type],
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <span>{toast.icon || icons[toast.type]}</span>
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; icon: string } | null>(null);

  return (
    <>
      {children}
      <ToastContainer toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

export { ToastProvider as default };
