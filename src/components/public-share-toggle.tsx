"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";

export function PublicShareToggle({ publicId, isPublic }: Readonly<{ publicId: string; isPublic: boolean }>) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleShare = async () => {
    const shareUrl = new URL(`/order-list/${encodeURIComponent(publicId)}`, window.location.origin).toString();

    if (isPublic) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setPending(true);
    try {
      await fetch("/api/public-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
      router.refresh();
      
      // After sharing, also copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to share order", error);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant={isPublic ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={handleShare}
      className="min-w-[100px]"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Sharing...
        </span>
      ) : isPublic ? (
        copied ? "Copied!" : "Copy link"
      ) : (
        "Share link"
      )}
    </Button>
  );
}
