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
      <div role="dialog" aria-modal="true" aria-labelledby="market-modal-title" className="relative z-10 w-full max-w-xl overflow-hidden bg-card font-mono text-card-foreground animate-sheet">
        <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-border px-5 py-4 sm:px-6">
          <div>
            <h3 id="market-modal-title" className="text-lg font-bold uppercase tracking-wide">Price list</h3>
            <p className="mt-1 text-xs text-muted-foreground">What each item costs today.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="max-h-[70dvh] divide-y divide-dotted divide-border overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {marketItems.map((item) => (
            <div key={item.id ?? item.name} className="grid grid-cols-[1fr_auto] items-start gap-4 px-5 py-3 sm:px-6">
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
              <div className="flex flex-col items-end gap-1.5">
                {item.price === "Pending" ? <span className="stamp">No price</span> : <span className="font-bold">{item.price}</span>}
                <Badge variant={item.status === "Active" ? "success" : "outline"}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
