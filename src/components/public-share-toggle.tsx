"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";

export function PublicShareToggle({ publicId, isPublic }: Readonly<{ publicId: string; isPublic: boolean }>) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  if (isPublic) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/public-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId }),
        });
        router.refresh();
        setPending(false);
      }}
    >
      {pending ? "Sharing..." : "Share link"}
    </Button>
  );
}
