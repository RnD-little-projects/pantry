"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Minus, Plus } from "lucide-react";

type EditableQuantityCellProps = {
  publicId: string;
  itemIndex: number;
  quantityLabel: string;
  isCreator: boolean;
  /** "cell" renders a <td>, "inline" renders a <div>. Default: "cell" */
  variant?: "cell" | "inline";
};

export function EditableQuantityCell({ publicId, itemIndex, quantityLabel, isCreator, variant = "cell" }: EditableQuantityCellProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(quantityLabel);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  // Sync state with parent updates
  useEffect(() => {
    setValue(quantityLabel);
  }, [quantityLabel]);

  const saveQuantity = async (newValue: string) => {
    const cleaned = newValue.trim();
    if (!isCreator) {
      return;
    }

    if (cleaned.length < 1) {
      setStatus("error");
      toast("Quantity cannot be empty", "error");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/order-list/update-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicId, itemIndex, quantityLabel: cleaned }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to update quantity.");
      }

      setStatus("idle");
      router.refresh();
    } catch (error) {
      setStatus("error");
      toast((error as Error).message || "Unable to update quantity.", "error");
    }
  };

  const handleBlur = async () => {
    const cleaned = value.trim();
    if (!isCreator || cleaned === quantityLabel) {
      return;
    }
    await saveQuantity(cleaned);
  };

  const handleIncrement = async () => {
    if (!isCreator || status === "saving") return;
    const currentNum = parseInt(value, 10);
    const nextVal = (isNaN(currentNum) ? 0 : currentNum) + 1;
    const strVal = String(nextVal);
    setValue(strVal);
    await saveQuantity(strVal);
  };

  const handleDecrement = async () => {
    if (!isCreator || status === "saving") return;
    const currentNum = parseInt(value, 10);
    const nextVal = (isNaN(currentNum) ? 0 : currentNum) - 1;
    
    if (nextVal < 1) {
      toast("Quantity must be at least 1", "error");
      return;
    }
    
    const strVal = String(nextVal);
    setValue(strVal);
    await saveQuantity(strVal);
  };

  const inner = (
    <div className={`relative flex w-fit items-center ${variant === "cell" ? "mx-auto" : ""} gap-1 rounded-full bg-muted p-1 ${status === "error" ? "ring-2 ring-destructive" : ""}`}>
      {isCreator && (
        <button
          type="button"
          onClick={handleDecrement}
          disabled={status === "saving"}
          className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-secondary active:translate-y-px disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Decrease quantity"
        >
          <Minus aria-hidden="true" className="h-4 w-4" />
        </button>
      )}

      <input
        type="number"
        inputMode="numeric"
        aria-label="Quantity"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("idle");
        }}
        onBlur={handleBlur}
        disabled={!isCreator}
        placeholder="0"
        className={`no-spinner w-10 border-0 bg-transparent text-center text-base font-extrabold tabular-nums text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 disabled:cursor-default ${status === "saving" ? "opacity-50" : ""}`}
      />

      {isCreator && (
        <button
          type="button"
          onClick={handleIncrement}
          disabled={status === "saving"}
          className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Increase quantity"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  if (variant === "inline") {
    return inner;
  }

  return (
    <td className="px-2 py-2">
      {inner}
    </td>
  );
}

