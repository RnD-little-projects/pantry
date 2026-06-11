"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

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
    <div className="relative flex items-center justify-between gap-1 w-full max-w-[130px] mx-auto bg-muted/20 border border-border/40 rounded-lg p-0.5 shadow-sm group hover:border-primary/50 focus-within:border-primary transition-all duration-200">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!isCreator || status === "saving"}
        className="w-7 h-7 flex items-center justify-center text-sm font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        aria-label="Decrease quantity"
      >
        -
      </button>
      
      <input
        type="number"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("idle");
        }}
        onBlur={handleBlur}
        disabled={!isCreator}
        placeholder="0"
        className={`w-12 border-0 bg-transparent py-0.5 text-center font-mono text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 no-spinner ${!isCreator ? "cursor-not-allowed opacity-70" : ""}`}
      />
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={!isCreator || status === "saving"}
        className="w-7 h-7 flex items-center justify-center text-sm font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        aria-label="Increase quantity"
      >
        +
      </button>

      {status === "saving" && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      )}
      {status === "error" && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-bold text-destructive">!</div>
      )}
    </div>
  );

  if (variant === "inline") {
    return inner;
  }

  return (
    <td className="p-0">
      {inner}
    </td>
  );
}

