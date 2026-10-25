"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";

type DeleteItemButtonProps = {
  publicId: string;
  itemIndex: number;
  itemName?: string;
};

export function DeleteItemButton({ publicId, itemIndex, itemName = "this item" }: DeleteItemButtonProps) {
  const router = useRouter();
  const { toast, dismiss } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setShowConfirm(false);
    
    const loadingId = toast(`Deleting ${itemName}...`, "loading");
    
    try {
      const response = await fetch("/api/order-list/remove-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, itemIndex }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      dismiss(loadingId);
      toast(`${itemName} removed successfully`, "success");
      router.refresh();
    } catch (error) {
      dismiss(loadingId);
      toast((error as Error).message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        aria-label={`Remove ${itemName}`}
      >
        {isDeleting ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        )}
      </Button>

      <Dialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={`Remove ${itemName}?`}
        description="You can bring it back from the activity log."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove item
            </Button>
          </>
        }
      />
    </>
  );
}
