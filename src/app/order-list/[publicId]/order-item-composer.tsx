"use client";

import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

type OrderItemComposerProps = {
  publicId: string;
};

const AUTOSAVE_DELAY = 10000;

export function OrderItemComposer({ publicId }: OrderItemComposerProps) {
  const router = useRouter();
  const [itemName, setItemName] = useState("");
  const [quantityLabel, setQuantityLabel] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const timerRef = useRef<number | undefined>(undefined);
  const inFlightPayloadRef = useRef<string>("");
  const lastSavedPayloadRef = useRef<string>("");
  const dirtySinceSaveRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

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
      const response = await fetch(`/api/order-list/${publicId}/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemName: cleanName, quantityLabel: cleanQuantity }),
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

  const handleChange = (setter: Dispatch<SetStateAction<string>>) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    dirtySinceSaveRef.current = true;
    setStatus("idle");
    setMessage("");
    scheduleAutosave();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Add item</h2>
          <p className="text-sm text-muted-foreground">Creator only. Autosaves after 10 seconds of inactivity.</p>
        </div>
        <div className="text-right text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {status === "saved" ? "Saved" : status === "saving" ? "Saving..." : status === "error" ? "Error" : "Idle"}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Item Name</span>
          <input
            value={itemName}
            onChange={handleChange(setItemName)}
            placeholder="e.g. Bananas"
            className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quantity</span>
          <input
            value={quantityLabel}
            onChange={handleChange(setQuantityLabel)}
            placeholder="e.g. 2 kg"
            className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>
      <div className="mt-3 min-h-[1.5rem] text-sm text-muted-foreground">
        {status === "error" ? <span className="text-destructive">{message}</span> : <span>{message}</span>}
      </div>
    </div>
  );
}
