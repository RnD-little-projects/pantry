"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
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
  const [paidInCash, setPaidInCash] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || paidInCash) return;

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
  }, [open, paidInCash, toast]);

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
    const loadingId = toast(`Paying for "${orderTitle}"…`, "loading");

    try {
      const formData = new FormData();
      formData.append("publicId", publicId);
      
      if (paidInCash) {
        formData.append("paymentMethod", "cash");
      } else if (receiptFile) {
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
      toast("Paid. The list is now locked.", "success");
      setOpen(false);
      window.location.href = "/";
    } catch (error) {
      dismiss(loadingId);
      toast((error as Error).message, "error");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Button variant="highlight" size="lg" className="w-full" onClick={() => setOpen(true)}>
        Pay for the whole list
      </Button>

      <Dialog 
        open={open} 
        onOpenChange={setOpen}
        title="Pay for the whole list?"
        description="One payment covers every item. Attach a photo of the receipt, or mark it paid in cash. The list is then locked and its prices are frozen."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isArchiving}>
              Cancel
            </Button>
            <Button variant="highlight" onClick={handleArchive} disabled={isArchiving} className="gap-2">
              {isArchiving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              Pay and lock list
            </Button>
          </>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-control bg-muted px-3 py-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={paidInCash}
              onChange={(e) => setPaidInCash(e.target.checked)}
            />
            Paid in cash (no receipt)
          </label>

          {!paidInCash && (
          <div className="grid gap-2">
            <Label>Receipt</Label>
            
            {!previewUrl ? (
              <div className="grid gap-4">
                <div 
                  className="flex flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-input bg-muted/50 py-8 transition-colors hover:border-primary hover:bg-accent cursor-pointer"
                  onClick={() => document.getElementById("receipt-file")?.click()}
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload receipt image</p>
                    <p className="text-xs text-muted-foreground">Tap to choose a photo, or paste one</p>
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
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or paste a link</span>
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
                  <p className="text-xs text-muted-foreground">
                    Paste a link to your receipt image or photo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-control border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={previewUrl} 
                  alt="Receipt Preview" 
                  className="h-full w-full object-cover" 
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute bottom-2 right-2"
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
          )}
        </div>
      </Dialog>
    </>
  );
}
