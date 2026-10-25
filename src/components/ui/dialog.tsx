"use client";

import * as React from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";


interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: DialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm animate-fade"
        onClick={() => onOpenChange(false)}
      />

      {/* Content: bottom sheet on phones, centered card on larger screens */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-sheet border border-border bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-sheet custom-scrollbar sm:rounded-sheet"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 id="dialog-title" className="font-display text-xl text-balance">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="-mr-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>
        )}
        
        {children && <div className="mb-8">{children}</div>}
        
        {footer && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
