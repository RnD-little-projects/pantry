"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { SuggestionList, type Suggestion } from "@/components/ui/suggestion-list";
import type { MarketItem } from "@/lib/pantry-types";

// First-item field on the New list form, with the same suggestion dropdown as the order page
export function StartItemField({ marketItems }: { marketItems: ReadonlyArray<MarketItem> }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();

  const needle = value.trim().toLowerCase();
  const options: Suggestion[] = needle
    ? marketItems
        .filter((item) => item.name.toLowerCase().includes(needle) || item.aliases?.some((a) => a.toLowerCase().includes(needle)))
        .slice(0, 6)
        .map((item, index) => ({
          id: item.id ?? `${item.name}-${index}`,
          name: item.name,
          detail: item.price === "Pending" ? undefined : item.price,
        }))
    : [];
  // Hide the list once the field already holds exactly the one suggestion
  const listOpen = open && options.length > 0 && !(options.length === 1 && options[0].name.toLowerCase() === needle);

  const pick = (item: Suggestion) => {
    setValue(item.name);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <Input
        id="start-item"
        name="itemName"
        value={value}
        placeholder="milk, eggs, rice…"
        autoComplete="off"
        required
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listOpen}
        aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={listOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(e) => {
          if (listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (index + step + options.length) % options.length);
          } else if (listOpen && e.key === "Enter" && activeIndex >= 0) {
            // Pick the highlighted suggestion instead of submitting the form
            e.preventDefault();
            pick(options[activeIndex]);
          } else if (listOpen && e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      {listOpen && <SuggestionList id={listId} items={options} activeIndex={activeIndex} onSelect={pick} />}
    </div>
  );
}
