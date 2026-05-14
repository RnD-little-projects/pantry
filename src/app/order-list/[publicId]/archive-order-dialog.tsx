"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Archive, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type ArchiveOrderDialogProps = {
  publicId: string;
  orderTitle: string;
};

const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          0.7 // Compression quality
        );
      };
      img.onerror = () => reject(new Error("Invalid image format or image failed to load"));
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export function ArchiveOrderDialog({ publicId, orderTitle }: ArchiveOrderDialogProps) {
  const router = useRouter();
  const { toast, dismiss } = useToast();
  const [open, setOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            try {
              const compressedBlob = await compressImage(file);
              const compressedFile = new File([compressedBlob], file.name || "pasted-image.jpg", {
                type: "image/jpeg",
              });
              setReceiptFile(compressedFile);
              setPreviewUrl(URL.createObjectURL(compressedFile));
              setReceiptUrl(""); // Clear URL if file is selected
            } catch (err) {
              console.error("Paste compression error:", err);
              toast(`Failed to process pasted image: ${(err as Error).message}`, "error");
            }
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [open, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, {
        type: "image/jpeg",
      });
      setReceiptFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
      setReceiptUrl(""); // Clear URL if file is selected
    } catch {
      toast("Failed to compress image", "error");
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    const loadingId = toast(`Archiving "${orderTitle}"...`, "loading");

    try {
      const formData = new FormData();
      formData.append("publicId", publicId);
      
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      } else if (receiptUrl) {
        formData.append("receiptUrl", receiptUrl);
      }

      const response = await fetch(`/api/order-list/archive`, {
        method: "POST",
        body: formData, // Send as FormData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to archive order");
      }

      dismiss(loadingId);
      toast("Order archived successfully", "success");
      setOpen(false);
      router.refresh();
    } catch (error) {
      dismiss(loadingId);
      toast((error as Error).message, "error");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Archive className="h-4 w-4" />
        Archive Order
      </Button>

      <Dialog 
        open={open} 
        onOpenChange={setOpen}
        title="Archive Order"
        description="Archiving will lock the order and prevent any further items from being added."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isArchiving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isArchiving} className="gap-2">
              {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Confirm Archive
            </Button>
          </>
        }
      >
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Receipt Proof</Label>
            
            {!previewUrl ? (
              <div className="grid gap-4">
                <div 
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 py-8 transition-colors hover:bg-muted/30 cursor-pointer"
                  onClick={() => document.getElementById("receipt-file")?.click()}
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload receipt image</p>
                    <p className="text-[10px] text-muted-foreground">Click to browse or paste an image</p>
                  </div>
                  <input
                    id="receipt-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-card px-2 text-muted-foreground">or use URL</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    id="receipt"
                    placeholder="https://example.com/receipt.jpg"
                    value={receiptUrl}
                    onChange={(e) => {
                      setReceiptUrl(e.target.value);
                      setReceiptFile(null);
                      setPreviewUrl(null);
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Paste a link to your receipt image or photo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={previewUrl} 
                  alt="Receipt Preview" 
                  className="h-full w-full object-cover" 
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute bottom-2 right-2 h-7 text-[10px]"
                  onClick={() => {
                    setReceiptFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Remove & Change
                </Button>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
