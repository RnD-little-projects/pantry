"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EditableQuantityCellProps = {
  publicId: string;
  itemIndex: number;
  quantityLabel: string;
  isCreator: boolean;
};

export function EditableQuantityCell({ publicId, itemIndex, quantityLabel, isCreator }: EditableQuantityCellProps) {
  const router = useRouter();
  const [value, setValue] = useState(quantityLabel);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleBlur = async () => {
    const cleaned = value.trim();
    if (!isCreator || cleaned === quantityLabel) {
      return;
    }

    if (cleaned.length < 1) {
      setStatus("error");
      setMessage("Quantity cannot be empty");
      return;
    }

    setStatus("saving");
    setMessage("");

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
      setMessage("");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage((error as Error).message || "Unable to update quantity.");
    }
  };

  return (
    <td className="p-0">
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setStatus("idle");
            setMessage("");
          }}
          onBlur={handleBlur}
          disabled={!isCreator}
          placeholder="0"
          className={`w-full border-0 bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 ${!isCreator ? "cursor-not-allowed opacity-70" : ""}`}
        />
        {status === "error" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-destructive">!</div>
        )}
      </div>
      {status === "error" && <div className="mt-1 text-xs text-destructive">{message}</div>}
    </td>
  );
}
