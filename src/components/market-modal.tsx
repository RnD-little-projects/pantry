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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-slate-950/75 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close market list modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border/70 bg-card/96 shadow-[0_36px_100px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">Market list</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Item price list</h3>
            <p className="mt-2 text-sm text-muted-foreground">A quick modal view of item pricing without leaving the sidebar flow.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid grid-cols-[1.5fr_0.6fr_0.5fr] border-b border-border/60 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          <span>Item</span>
          <span className="text-right">Price</span>
          <span className="text-right">Status</span>
        </div>

        <div className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto">
          {marketItems.map((item) => (
            <div key={item.id ?? item.name} className="grid grid-cols-[1.5fr_0.6fr_0.5fr] items-center px-6 py-4 hover:bg-muted/30">
              <div>
                <div className="font-medium text-foreground">{item.name}</div>
                {item.aliases && item.aliases.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {item.aliases.map(alias => (
                      <span key={alias} className="text-[9px] text-muted-foreground/60 italic">
                        aka: {alias}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
              </div>
              <div className="text-right font-mono text-sm text-muted-foreground">{item.price}</div>
              <div className="text-right">
                <Badge variant={item.status === "Active" ? "default" : "secondary"}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
