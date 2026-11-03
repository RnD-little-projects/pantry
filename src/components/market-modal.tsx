"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MarketItem } from "../lib/pantry-types";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type MarketModalProps = {
  open: boolean;
  onClose: () => void;
  marketItems: ReadonlyArray<MarketItem>;
};

type Filter = "all" | "priced" | "unpriced";

const isPriced = (item: MarketItem) => item.price !== "Pending";

export function MarketModal({ open, ...props }: Readonly<MarketModalProps>) {
  // Body mounts only while open, so search and filter reset each time the modal opens
  return open ? <MarketModalBody {...props} /> : null;
}

function MarketModalBody({ onClose, marketItems }: Readonly<Omit<MarketModalProps, "open">>) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = useMemo(
    () => [...marketItems].sort((a, b) => a.name.localeCompare(b.name)),
    [marketItems],
  );
  const pricedCount = sorted.filter(isPriced).length;

  const q = query.trim().toLowerCase();
  const visible = sorted.filter(
    (item) =>
      (filter === "all" || (filter === "priced") === isPriced(item)) &&
      (!q || item.name.toLowerCase().includes(q) || item.aliases?.some((a) => a.includes(q))),
  );

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: sorted.length },
    { key: "priced", label: "Priced", count: pricedCount },
    { key: "unpriced", label: "No price", count: sorted.length - pricedCount },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm animate-fade sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close price list"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-modal-title"
        className="relative z-10 flex h-[92dvh] w-full max-w-4xl flex-col overflow-hidden bg-card font-mono text-card-foreground animate-sheet sm:h-[85dvh]"
      >
        <div className="space-y-3 border-b-2 border-dashed border-border px-5 pb-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 id="market-modal-title" className="text-lg font-bold">Price list</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">What each item costs today.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search items"
              placeholder="Search items or aliases…"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div role="group" aria-label="Filter by price" className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-9 rounded-control border px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f.key
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-dashed border-input hover:bg-muted",
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 custom-scrollbar sm:px-6">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
              <p>{q ? `No items match “${query.trim()}”.` : "No items in this list yet."}</p>
              {(q || filter !== "all") && (
                <Button variant="outline" size="sm" onClick={() => { setQuery(""); setFilter("all"); }}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ul className="sm:columns-2 sm:gap-x-8">
              {visible.map((item) => (
                <li key={item.id ?? item.name} className="break-inside-avoid border-b border-dotted border-border py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate font-semibold text-foreground" title={item.name}>{item.name}</span>
                    {/* Dot leader runs from the name to the price, like a market price board */}
                    <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-0.2em] border-b-2 border-dotted border-muted-foreground/40" />
                    {isPriced(item) ? (
                      <span className="shrink-0 font-bold tabular-nums">{item.price}</span>
                    ) : (
                      <span className="stamp shrink-0">No price</span>
                    )}
                  </div>
                  {(item.aliases?.length || item.note) ? (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.aliases?.length ? `aka: ${item.aliases.join(", ")}` : null}
                      {item.aliases?.length && item.note ? " / " : null}
                      {item.note}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
