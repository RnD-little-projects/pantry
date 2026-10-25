"use client";

import type { MarketItem } from "../lib/pantry-types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type MarketModalProps = {
  open: boolean;
  onClose: () => void;
  marketItems: ReadonlyArray<MarketItem>;
};

export function MarketModal({
  open,
  onClose,
  marketItems,
}: Readonly<MarketModalProps>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 animate-fade sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close market list modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-labelledby="market-modal-title" className="relative z-10 w-full max-w-2xl overflow-hidden rounded-t-sheet border border-border bg-card animate-sheet sm:rounded-sheet">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h3 id="market-modal-title" className="font-display text-2xl">Market prices</h3>
            <p className="mt-1 text-sm text-muted-foreground">Today’s price for each item the market carries.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_auto_5rem] gap-4 border-b border-border px-5 py-2.5 sm:px-6 text-xs font-semibold text-muted-foreground">
          <span>Item</span>
          <span className="text-right">Price</span>
          <span className="text-right">Status</span>
        </div>

        <div className="max-h-[65dvh] divide-y divide-border overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {marketItems.map((item) => (
            <div key={item.id ?? item.name} className="grid grid-cols-[1fr_auto_5rem] items-center gap-4 px-5 py-4 sm:px-6">
              <div>
                <div className="font-semibold text-foreground">{item.name}</div>
                {item.aliases && item.aliases.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {item.aliases.map(alias => (
                      <span key={alias} className="text-xs text-muted-foreground">
                        aka: {alias}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
              </div>
              <div className="text-right"><span className={item.price === "Pending" ? "sticker sticker-empty text-sm" : "sticker text-sm"}>{item.price}</span></div>
              <div className="text-right">
                <Badge variant={item.status === "Active" ? "success" : "secondary"}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
