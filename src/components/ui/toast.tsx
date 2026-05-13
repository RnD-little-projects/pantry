"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (type !== "loading" && duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-all animate-in slide-in-from-right-full duration-300",
              t.type === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              t.type === "error" && "bg-destructive/10 border-destructive/20 text-destructive",
              t.type === "info" && "bg-primary/10 border-primary/20 text-primary",
              t.type === "loading" && "bg-muted/50 border-border/50 text-muted-foreground",
              "backdrop-blur-xl"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="h-5 w-5" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5" />}
            {t.type === "info" && <Info className="h-5 w-5" />}
            {t.type === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            
            <p className="text-sm font-medium">{t.message}</p>
            
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
