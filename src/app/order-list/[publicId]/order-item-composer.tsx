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
  const itemNameRef = useRef<HTMLInputElement | null>(null);
  const quantityLabelRef = useRef<HTMLInputElement | null>(null);

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

  const handleChange = (setter: Dispatch<SetStateAction<string>>) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    dirtySinceSaveRef.current = true;
    setStatus("idle");
    setMessage("");
    scheduleAutosave();
  };

  const handleFocusOutside = () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active === itemNameRef.current || active === quantityLabelRef.current) {
        return;
      }

      handleAutosave();
    }, 20);
  };

  return (
    <tr className="bg-slate-950/90">
      <td className="p-0">
        <input
          ref={itemNameRef}
          value={itemName}
          onChange={handleChange(setItemName)}
          onBlur={handleFocusOutside}
          placeholder="Add item name"
          className="w-full border-0 bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
        />
      </td>
      <td className="p-0">
        <input
          ref={quantityLabelRef}
          value={quantityLabel}
          onChange={handleChange(setQuantityLabel)}
          onBlur={handleFocusOutside}
          placeholder="Add quantity"
          className="w-full border-0 bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
        />
      </td>
      <td className="text-muted-foreground">&nbsp;</td>
      <td className="text-right text-xs uppercase tracking-[0.22em] text-muted-foreground pr-4">
        {status === "saved" ? "Saved" : status === "saving" ? "Saving..." : status === "error" ? "Error" : "Idle"}
      </td>
    </tr>
  );
}
