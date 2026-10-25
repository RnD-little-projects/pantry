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
      <div className="relative flex h-8 items-center rounded-full bg-muted/30 p-1 border border-border">
        {/* Sliding Background */}
        <div 
          className={cn(
            "absolute h-6 w-[70px] rounded-full bg-primary transition-all duration-300 ease-in-out",
            isPublic ? "left-[76px]" : "left-1"
          )}
        />
        
        <button
          type="button"
          disabled={pending}
          onClick={() => handleToggle(false)}
          className={cn(
            "relative z-10 w-[70px] px-2 text-xs font-bold transition-colors duration-200",
            !isPublic ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Private
        </button>
        
        <button
          type="button"
          disabled={pending}
          onClick={() => handleToggle(true)}
          className={cn(
            "relative z-10 w-[70px] px-2 text-xs font-bold transition-colors duration-200",
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
          "text-xs font-bold transition-all duration-300 overflow-hidden whitespace-nowrap",
          copied ? "w-16 opacity-100" : "w-0 opacity-0"
        )}>
          <span className="text-primary">Copied!</span>
        </div>
      )}
    </div>
  );
}
