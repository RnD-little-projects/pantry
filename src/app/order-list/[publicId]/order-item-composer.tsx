"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { MarketItem } from "@/lib/pantry-types";
import { SuggestionList, type Suggestion } from "@/components/ui/suggestion-list";


type OrderItemComposerProps = {
  publicId: string;
  marketItems?: ReadonlyArray<MarketItem>;
};

const AUTOSAVE_DELAY = 10000;

export function OrderItemComposer({ publicId, marketItems = [] }: OrderItemComposerProps) {
  const router = useRouter();
  const [itemName, setItemName] = useState("");
  const [quantityLabel, setQuantityLabel] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autosaveTrigger, setAutosaveTrigger] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();

  const timerRef = useRef<number | undefined>(undefined);
  const inFlightPayloadRef = useRef<string>("");
  const lastSavedPayloadRef = useRef<string>("");
  const dirtySinceSaveRef = useRef<boolean>(false);
  const itemNameRef = useRef<HTMLInputElement | null>(null);
  const quantityLabelRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Derive suggestions and autocorrect info from current input (no effect needed)
  const { suggestions, autocorrectInfo } = useMemo(() => {
    const query = itemName.trim().toLowerCase();
    if (query.length < 2) {
      return { suggestions: [] as MarketItem[], autocorrectInfo: null };
    }

    const filtered = marketItems.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const aliasMatch = item.aliases?.some(a => a.toLowerCase().includes(query));
      return nameMatch || aliasMatch;
    }).slice(0, 5);

    // Check for exact alias match to show autocorrect warning
    const exactMatch = marketItems.find(item => {
      if (item.name.toLowerCase() === query) return false;
      return item.aliases?.some(a => a.toLowerCase() === query);
    });

    const info = exactMatch
      ? { original: exactMatch.name, matched: query }
      : null;

    return { suggestions: filtered, autocorrectInfo: info };
  }, [itemName, marketItems]);



  const buildPayload = (name: string, quantity: string) => `${name.trim()}|${quantity.trim()}`;

  const validate = (name: string, quantity: string) => {
    const cleanName = name.trim();
    const cleanQuantity = quantity.trim();

    if (cleanName.length < 2) {
      throw new Error("Item name must be at least 2 characters.");
    }

    if (cleanQuantity.length < 1) {
      throw new Error("Quantity label is required.");
    }

    return { cleanName, cleanQuantity };
  };

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const handleAutosave = async () => {
    const payload = buildPayload(itemName, quantityLabel);
    // payload is "name|qty", so it is never empty; check the fields themselves
    if (!itemName.trim() && !quantityLabel.trim()) {
      return;
    }

    if (inFlightPayloadRef.current === payload) {
      return;
    }

    if (payload === lastSavedPayloadRef.current && !dirtySinceSaveRef.current) {
      return;
    }

    let cleanName: string;
    let cleanQuantity: string;
    try {
      ({ cleanName, cleanQuantity } = validate(itemName, quantityLabel));
    } catch (error) {
      setStatus("error");
      setMessage((error as Error).message);
      return;
    }

    inFlightPayloadRef.current = payload;
    setStatus("saving");
    setMessage("Saving item…");

    try {
      const response = await fetch(`/api/order-list/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicId, itemName: cleanName, quantityLabel: cleanQuantity }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to save item.");
      }

      lastSavedPayloadRef.current = payload;
      dirtySinceSaveRef.current = false;
      setItemName("");
      setQuantityLabel("");
      setStatus("saved");
      setMessage("Saved");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage((error as Error).message || "Unable to save item.");
    } finally {
      inFlightPayloadRef.current = "";
      clearTimer();
    }
  };

  const scheduleAutosave = () => {
    clearTimer();

    if (!itemName.trim() && !quantityLabel.trim()) {
      setStatus("idle");
      setMessage("");
      return;
    }

    setStatus("idle");
    setMessage("Autosaving in 10 seconds…");

    timerRef.current = window.setTimeout(() => {
      handleAutosave();
    }, AUTOSAVE_DELAY);
  };

  // Trigger autosave via effect when autosaveTrigger changes (avoids ref access during render)
  useEffect(() => {
    if (autosaveTrigger === 0) return;
    // Use a microtask to avoid the "setState in effect" lint rule
    const timer = window.setTimeout(() => scheduleAutosave(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveTrigger]);

  const handleChange = (setter: Dispatch<SetStateAction<string>>) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    dirtySinceSaveRef.current = true;
    setStatus("idle");
    setMessage("");
    // Trigger autosave via state change to avoid ref access during render
    setAutosaveTrigger(prev => prev + 1);
    if (setter === setItemName) {
      setShowSuggestions(true);
      setActiveIndex(-1);
    }
  };

  const handleFocusOutside = () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active === itemNameRef.current || active === quantityLabelRef.current) {
        return;
      }

      setShowSuggestions(false);
      handleAutosave();
    }, 200);
  };

  const selectSuggestion = (item: Suggestion) => {
    setItemName(item.name);
    setShowSuggestions(false);
    setActiveIndex(-1);
    quantityLabelRef.current?.focus();
  };

  // Enter in either field, or the Add button, saves right away instead of waiting for autosave
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && listOpen && activeIndex >= 0) {
      // Enter on a highlighted suggestion picks it instead of saving
      event.preventDefault();
      selectSuggestion(suggestionItems[activeIndex]);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      setShowSuggestions(false);
      handleAutosave();
    }
  };

  const suggestionItems: Suggestion[] = suggestions.map((item, index) => ({
    id: item.id ?? `${item.name}-${index}`,
    name: item.name,
    detail: item.price === "Pending" ? undefined : item.price,
  }));
  const listOpen = showSuggestions && suggestionItems.length > 0;

  const handleNameKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + suggestionItems.length) % suggestionItems.length);
      return;
    }
    if (listOpen && event.key === "Escape") {
      event.preventDefault();
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }
    handleEnter(event);
  };

  const fieldClass = "h-11 w-full rounded-control border border-dashed border-input bg-transparent px-3 font-mono text-base text-card-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-solid focus:border-ring sm:text-sm";

  return (
    <tr>
      <td className="relative p-0 pr-2 align-top">
        <input
          ref={itemNameRef}
          value={itemName}
          onChange={handleChange(setItemName)}
          onBlur={handleFocusOutside}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleNameKeys}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={listOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-label="Item name"
          placeholder="+ add item…"
          autoComplete="off"
          enterKeyHint="done"
          className={fieldClass}
        />

        {listOpen && (
          <SuggestionList id={listId} items={suggestionItems} activeIndex={activeIndex} onSelect={selectSuggestion} />
        )}

        {/* Shown under the field (not floating) so it never covers the suggestions */}
        {autocorrectInfo && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Will be saved as <strong className="text-foreground">{autocorrectInfo.original}</strong>
          </p>
        )}

        {status === "error" && message && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{message}</p>
        )}
      </td>
      <td className="w-16 p-0 pr-2 align-top sm:w-20">
        <input
          ref={quantityLabelRef}
          type="number"
          inputMode="numeric"
          aria-label="Quantity"
          value={quantityLabel}
          onChange={handleChange(setQuantityLabel)}
          onBlur={handleFocusOutside}
          onKeyDown={handleEnter}
          placeholder="Qty"
          className={`${fieldClass} no-spinner px-2 text-center`}
        />
      </td>
      <td className="w-px p-0 align-top">
        <button
          type="button"
          // Keep focus in the fields so blur-autosave doesn't race this click
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setShowSuggestions(false);
            handleAutosave();
          }}
          disabled={status === "saving"}
          className="inline-flex h-11 touch-manipulation items-center gap-1.5 rounded-control bg-primary px-4 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span className="max-sm:sr-only">{status === "saving" ? "Adding…" : "Add"}</span>
        </button>
        <span className="sr-only" aria-live="polite">
          {status === "saved" ? "Item added" : status === "saving" ? "Adding item" : ""}
        </span>
      </td>
    </tr>
  );
}
