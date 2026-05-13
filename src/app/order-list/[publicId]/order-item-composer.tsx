"use client";

import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { MarketItem } from "@/lib/pantry-types";
import { cn } from "@/lib/utils";

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
  const [suggestions, setSuggestions] = useState<MarketItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocorrectInfo, setAutocorrectInfo] = useState<{ original: string; matched: string } | null>(null);

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

  // Search for matches as user types
  useEffect(() => {
    const query = itemName.trim().toLowerCase();
    if (query.length < 2) {
      if (suggestions.length > 0) setSuggestions([]);
      if (autocorrectInfo) setAutocorrectInfo(null);
      return;
    }

    const filtered = marketItems.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const aliasMatch = item.aliases?.some(a => a.toLowerCase().includes(query));
      return nameMatch || aliasMatch;
    }).slice(0, 5);

    // Only update if the filtered results are actually different
    const currentIds = suggestions.map(s => s.id).join(",");
    const newIds = filtered.map(s => s.id).join(",");
    if (currentIds !== newIds) {
      setSuggestions(filtered);
    }

    // Check for exact alias match to show autocorrect warning
    const exactMatch = marketItems.find(item => {
      if (item.name.toLowerCase() === query) return false; // Already correct
      return item.aliases?.some(a => a.toLowerCase() === query);
    });

    if (exactMatch) {
      if (autocorrectInfo?.original !== exactMatch.name) {
        setAutocorrectInfo({ original: exactMatch.name, matched: query });
      }
    } else if (autocorrectInfo) {
      setAutocorrectInfo(null);
    }
  }, [itemName, marketItems, suggestions, autocorrectInfo]);

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

  const scheduleAutosave = () => {
    clearTimer();

    if (!itemName.trim() && !quantityLabel.trim()) {
      setStatus("idle");
      setMessage("");
      return;
    }

    setStatus("idle");
    setMessage("Autosaving in 10 seconds...");

    timerRef.current = window.setTimeout(() => {
      handleAutosave();
    }, AUTOSAVE_DELAY);
  };

  const handleAutosave = async () => {
    const payload = buildPayload(itemName, quantityLabel);
    if (!payload.trim()) {
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
    setMessage("Saving item...");

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
      setAutocorrectInfo(null);
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

  const handleChange = (setter: Dispatch<SetStateAction<string>>) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    dirtySinceSaveRef.current = true;
    setStatus("idle");
    setMessage("");
    scheduleAutosave();
    if (setter === setItemName) {
      setShowSuggestions(true);
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

  const selectSuggestion = (item: MarketItem) => {
    setItemName(item.name);
    setShowSuggestions(false);
    setAutocorrectInfo(null);
    quantityLabelRef.current?.focus();
  };

  return (
    <tr className="bg-muted/40">
      <td className="p-0 relative">
        <input
          ref={itemNameRef}
          value={itemName}
          onChange={handleChange(setItemName)}
          onBlur={handleFocusOutside}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Add item name"
          className="w-full border-0 bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
        />
        
        {/* Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg backdrop-blur-xl">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-muted/80 transition-colors"
                onMouseDown={() => selectSuggestion(item)}
              >
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <span className="text-[10px] text-muted-foreground">{item.price} • {item.note}</span>
              </button>
            ))}
          </div>
        )}

        {/* Autocorrect Warning */}
        {autocorrectInfo && (
          <div className="absolute left-4 top-[calc(100%+4px)] z-[101] flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium text-primary border border-primary/20 backdrop-blur-md">
            <span>✨ Will autocorrect to: <strong>{autocorrectInfo.original}</strong></span>
          </div>
        )}
      </td>
      <td className="p-0">
        <input
          ref={quantityLabelRef}
          type="number"
          value={quantityLabel}
          onChange={handleChange(setQuantityLabel)}
          onBlur={handleFocusOutside}
          placeholder="0"
          className="w-full border-0 bg-transparent px-2 py-3 text-center text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 no-spinner"
        />
      </td>
      <td className="text-muted-foreground">&nbsp;</td>
      <td className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground pr-4">
        {status === "saved" ? "Saved" : status === "saving" ? "Saving..." : status === "error" ? "Error" : ""}
      </td>
      <td>&nbsp;</td>
    </tr>
  );
}
