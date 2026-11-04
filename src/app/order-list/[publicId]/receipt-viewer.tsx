"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const TAP_ZOOM = 2.5;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function ReceiptViewer({ src }: Readonly<{ src: string }>) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(MIN_ZOOM);
  // Point to keep under the cursor: where it sits in the frame, where it sat in the content before zooming
  // (read at event time, since shrinking the image clamps the scroll first), and the zoom change since the last render
  const anchor = useRef<{ x: number; y: number; contentX: number; contentY: number; ratio: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const lastPointer = useRef("mouse");

  const zoomTo = (next: number, x: number, y: number) => {
    const prev = zoomRef.current;
    next = clampZoom(next);
    if (next === prev) return;
    zoomRef.current = next;
    const frame = frameRef.current;
    const pending = anchor.current;
    anchor.current = pending
      ? { ...pending, x, y, ratio: pending.ratio * (next / prev) }
      : { x, y, contentX: (frame?.scrollLeft ?? 0) + x, contentY: (frame?.scrollTop ?? 0) + y, ratio: next / prev };
    setZoom(next);
  };

  const zoomAtCenter = (next: number, frame: HTMLElement) => zoomTo(next, frame.clientWidth / 2, frame.clientHeight / 2);

  // The frame mounts only when the dialog opens; a callback ref attaches (and cleans up) the wheel listener then.
  // React's onWheel is passive, so it can't stop the browser from zooming the whole page on ctrl+wheel.
  const attachFrame = useCallback((frame: HTMLDivElement | null) => {
    frameRef.current = frame;
    if (!frame) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = frame.getBoundingClientRect();
      zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.002), e.clientX - rect.left, e.clientY - rect.top);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  // After the image resizes, scroll so the anchored point stays where it was
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const a = anchor.current;
    if (!frame || !a) return;
    anchor.current = null;
    frame.scrollLeft = a.contentX * a.ratio - a.x;
    frame.scrollTop = a.contentY * a.ratio - a.y;
  }, [zoom]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      zoomRef.current = MIN_ZOOM;
      anchor.current = null;
      setZoom(MIN_ZOOM);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="View receipt photo" className="relative h-16 w-24 shrink-0 overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Image src={src} alt="" fill unoptimized className="object-cover" />
      </button>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
        <ImageIcon aria-hidden="true" className="h-4 w-4" /> View receipt photo
      </button>

      <Dialog open={open} onOpenChange={close} title="Receipt photo" description="Ctrl + scroll or + / − to zoom, drag to move. On a phone, tap to zoom.">
        {/* Zoomed: image grows past the frame and the frame scrolls, so touch drag pans natively */}
        <div
          ref={attachFrame}
          tabIndex={0}
          role="group"
          aria-label={`Receipt photo, zoom ${Math.round(zoom * 100)}%`}
          className="max-h-[65dvh] select-none overflow-auto overscroll-contain rounded-control border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ cursor: zoom > MIN_ZOOM ? "grab" : "zoom-in" }}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType;
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            const frame = e.currentTarget;
            drag.current = { x: e.clientX, y: e.clientY, left: frame.scrollLeft, top: frame.scrollTop };
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.style.cursor = "grabbing";
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            e.currentTarget.scrollLeft = d.left - (e.clientX - d.x);
            e.currentTarget.scrollTop = d.top - (e.clientY - d.y);
          }}
          onPointerUp={(e) => {
            drag.current = null;
            e.currentTarget.style.cursor = zoom > MIN_ZOOM ? "grab" : "zoom-in";
          }}
          onPointerCancel={() => { drag.current = null; }}
          onClick={(e) => {
            // Touch has no ctrl+wheel or mouse drag, so a tap toggles zoom at the tapped point
            if (lastPointer.current === "mouse") return;
            const rect = e.currentTarget.getBoundingClientRect();
            zoomTo(zoomRef.current > MIN_ZOOM ? MIN_ZOOM : TAP_ZOOM, e.clientX - rect.left, e.clientY - rect.top);
          }}
          onKeyDown={(e) => {
            if (e.key === "+" || e.key === "=") zoomAtCenter(zoomRef.current * 1.25, e.currentTarget);
            else if (e.key === "-") zoomAtCenter(zoomRef.current / 1.25, e.currentTarget);
            else if (e.key === "0") zoomAtCenter(MIN_ZOOM, e.currentTarget);
            else return;
            e.preventDefault();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Receipt photo" draggable={false} className="block h-auto max-w-none" style={{ width: `${zoom * 100}%` }} />
        </div>
      </Dialog>
    </>
  );
}
