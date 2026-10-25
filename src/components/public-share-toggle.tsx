"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


import { cn } from "@/lib/utils";

export function PublicShareToggle({ publicId, isPublic }: Readonly<{ publicId: string; isPublic: boolean }>) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleToggle = async (newState: boolean) => {
    if (pending) return;
    
    setPending(true);
    try {
      const response = await fetch("/api/public-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, isPublic: newState }),
      });

      if (response.ok && newState) {
        // Automatic copy if making public
        const shareUrl = new URL(`/order-list/${encodeURIComponent(publicId)}`, window.location.origin).toString();
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      
      router.refresh();
    } catch (error) {
      console.error("Failed to update privacy", error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-10 items-center rounded-full bg-muted p-1">
        {/* Sliding Background */}
        <div 
          className={cn(
            "absolute h-8 w-[70px] rounded-full bg-primary transition-[left] duration-200 ease-out motion-reduce:transition-none",
            isPublic ? "left-[74px]" : "left-1"
          )}
        />
        
        <button
          type="button"
          disabled={pending}
          onClick={() => handleToggle(false)}
          aria-pressed={!isPublic}
          className={cn(
            "relative z-10 h-8 w-[70px] rounded-full px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !isPublic ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Private
        </button>
        
        <button
          type="button"
          disabled={pending}
          onClick={() => handleToggle(true)}
          aria-pressed={isPublic}
          className={cn(
            "relative z-10 h-8 w-[70px] rounded-full px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isPublic ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Public
        </button>

        {/* Circular Loading Overlay */}
        {pending && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-background/20">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {isPublic && (
        <div className={cn(
          "overflow-hidden whitespace-nowrap text-sm font-semibold transition-[width,opacity] duration-200",
          copied ? "w-24 opacity-100" : "w-0 opacity-0"
        )}>
          <span className="text-primary" aria-live="polite">Link copied</span>
        </div>
      )}
    </div>
  );
}
