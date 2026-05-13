"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";

type UndoActionButtonProps = {
  publicId: string;
  auditLogId: string;
};

export function UndoActionButton({ publicId, auditLogId }: UndoActionButtonProps) {
  const router = useRouter();
  const { toast, dismiss } = useToast();
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    setIsUndoing(true);
    const loadingId = toast("Restoring item...", "loading");

    try {
      const response = await fetch("/api/order-list/undo-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, auditLogId }),
      });

      if (!response.ok) {
        throw new Error("Failed to undo action");
      }

      dismiss(loadingId);
      toast("Item restored successfully", "success");
      router.refresh();
    } catch (error) {
      dismiss(loadingId);
      toast((error as Error).message, "error");
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <button
      onClick={handleUndo}
      disabled={isUndoing}
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 disabled:opacity-50 transition-colors mt-1"
    >
      {isUndoing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Undo2 className="h-3 w-3" />
      )}
      <span>Undo</span>
    </button>
  );
}
