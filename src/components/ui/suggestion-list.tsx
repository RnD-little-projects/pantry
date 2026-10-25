"use client";

import { cn } from "@/lib/utils";

export type Suggestion = { id: string; name: string; detail?: string };

/**
 * Receipt-style dropdown for type-to-search fields: name, dotted leader, then a detail such as the price.
 * The field that opens it owns the keyboard (arrows, Enter, Escape) and passes the active index in.
 */
export function SuggestionList({
  id,
  items,
  activeIndex,
  onSelect,
  className,
}: {
  id: string;
  items: ReadonlyArray<Suggestion>;
  activeIndex: number;
  onSelect: (item: Suggestion) => void;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul
      id={id}
      role="listbox"
      className={cn("absolute inset-x-0 top-full z-[100] mt-1 border border-input bg-popover py-1 font-mono text-popover-foreground animate-fade", className)}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          // Pick before the field's blur handler runs and closes the list
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          className={cn(
            "flex cursor-pointer items-baseline gap-2 px-3 py-2.5 text-sm transition-colors",
            index === activeIndex ? "bg-muted" : "hover:bg-muted",
          )}
        >
          <span className="min-w-0 truncate font-semibold">{item.name}</span>
          <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-[3px] border-b border-dotted border-input" />
          {item.detail && <span className="shrink-0 tabular-nums text-muted-foreground">{item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}
