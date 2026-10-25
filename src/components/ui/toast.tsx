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
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[200] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-full bg-foreground py-2 pl-4 pr-2 text-background animate-sheet",
              t.type === "success" && "[&>svg:first-child]:text-success",
              t.type === "error" && "bg-destructive text-destructive-foreground",
              t.type === "info" && "[&>svg:first-child]:text-highlight",
            )}
          >
            {t.type === "success" && <CheckCircle2 className="h-5 w-5" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5" />}
            {t.type === "info" && <Info className="h-5 w-5" />}
            {t.type === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            
            <p className="text-sm font-medium">{t.message}</p>
            
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="ml-1 rounded-full p-1.5 hover:bg-background/15"
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
