"use client";

import { useActionState, useEffect } from "react";

import { useToast } from "@/components/ui/toast";
import { startOrderAction } from "./new-order-action";

// Wraps the New list form so errors from starting a list show as a toast instead of the error page
export function StartOrderForm({ className, children }: { className?: string; children: React.ReactNode }) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(startOrderAction, null);

  useEffect(() => {
    if (state?.error) toast(state.error, "error");
  }, [state, toast]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
