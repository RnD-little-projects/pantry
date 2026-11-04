"use client";

import { useState } from "react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

export function ReceiptViewer({ src }: Readonly<{ src: string }>) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setZoomed(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="View receipt photo" className="relative h-16 w-24 shrink-0 overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Image src={src} alt="" fill unoptimized className="object-cover" />
      </button>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
        <ImageIcon aria-hidden="true" className="h-4 w-4" /> View receipt photo
      </button>

      <Dialog open={open} onOpenChange={close} title="Receipt photo" description={zoomed ? "Drag or scroll to look around. Tap to zoom out." : "Tap the photo to zoom in."}>
        {/* Zoomed: image grows past the frame and the frame scrolls, so touch drag pans it */}
        <div className="max-h-[65dvh] overflow-auto overscroll-contain rounded-control border border-border bg-muted">
          <button type="button" onClick={() => setZoomed((z) => !z)} aria-label={zoomed ? "Zoom out" : "Zoom in"} className={zoomed ? "block w-[250%] max-w-none cursor-zoom-out" : "block w-full cursor-zoom-in"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Receipt photo" className="h-auto w-full" />
          </button>
        </div>
      </Dialog>
    </>
  );
}
