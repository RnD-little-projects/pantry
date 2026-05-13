"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
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
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>

      <Dialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Delete Item"
        description={`Are you sure you want to remove "${itemName}" from the list? This action can be undone from the activity log.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              className="bg-destructive text-white hover:bg-destructive/90" 
              onClick={handleDelete}
            >
              Delete Item
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-destructive border border-destructive/20">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium leading-tight">This item will be removed from your order.</p>
        </div>
      </Dialog>
    </>
  );
}
