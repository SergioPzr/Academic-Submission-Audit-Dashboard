import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastState {
  message: string;
  emoji: string;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string, emoji?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: "", emoji: "✅", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, emoji = "✅") => {
    setToast({ message, emoji, visible: true });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" style={{ display: toast.visible ? "flex" : "none" }}>
        <span>{toast.emoji}</span> {toast.message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
