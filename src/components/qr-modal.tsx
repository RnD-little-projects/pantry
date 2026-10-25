"use client";

import { useEffect, useState } from "react";

type QrModalProps = {
  open: boolean;
  onClose: () => void;
};

export function QrModal({ open, onClose }: Readonly<QrModalProps>) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setError(null);

    async function fetchQrCodes() {
      try {
        const response = await fetch("/api/qr-codes");
        if (!response.ok) {
          throw new Error("Failed to load QR code list");
        }
        const data = await response.json();
        if (active) {
          setImages(data.images || []);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message || "An error occurred");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchQrCodes();

    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  const formatLabel = (filename: string) => {
    const withoutExt = filename.replace(/\.[^/.]+$/, "");
    return withoutExt
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 transition-opacity duration-300">
        <button
          type="button"
          aria-label="Close QR code modal"
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />
        
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-control border border-border bg-card p-6 animate-sheet">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">QR Codes</h3>
              <p className="text-xs text-muted-foreground">Select a code to enlarge</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-full hover:bg-muted/40 cursor-pointer"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Grid Content */}
          <div className="max-h-[50vh] overflow-y-auto pt-6 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Scanning images…</p>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-xs font-semibold text-destructive">{error}</p>
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No QR codes found.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {images.map((filename) => (
                  <button
                    key={filename}
                    onClick={() => setSelectedImage(filename)}
                    className="group flex flex-col items-center gap-1.5 rounded-lg p-1.5 hover:bg-muted/30 transition-[color,background-color,border-color,opacity,transform] duration-200 cursor-pointer"
                  >
                    {/* QR codes need a white quiet zone to scan, regardless of theme */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-white p-1.5 transition-[color,background-color,border-color,opacity,transform] duration-200 group-hover:scale-[1.04] group-hover:border-primary/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`/assets/images/${filename}`} 
                        alt={formatLabel(filename)}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground truncate w-full text-center transition-colors group-hover:text-foreground">
                      {formatLabel(filename)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom View */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 p-4 animate-fade">
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
            aria-label="Close zoomed image"
          />
          
          <div className="relative z-10 flex flex-col items-center max-w-[95vw] max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="overflow-hidden rounded-control bg-white p-4 max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={`/assets/images/${selectedImage}`} 
                alt={formatLabel(selectedImage)}
                className="w-auto h-auto max-h-[70vh] max-w-full object-contain"
              />
            </div>
            
            <p className="mt-4 rounded-full bg-muted px-4 py-1.5 text-sm font-semibold text-foreground">
              {formatLabel(selectedImage)}
            </p>
            
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="mt-6 cursor-pointer rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to Gallery
            </button>
          </div>
        </div>
      )}
    </>
  );
}
