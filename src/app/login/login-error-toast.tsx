"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

const messages: Record<string, string> = {
  AccessDenied: "Access denied.",
  GoogleEmailInUse: "Email already in use. Sign in with your password.",
  Configuration: "Sign-in is unavailable right now.",
};

export function LoginErrorToast({ error }: { error: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in dev; show the toast once
    if (shown.current) return;
    shown.current = true;
    toast(messages[error] ?? "Couldn't sign you in.", "error", 5000);
    // Drop ?error= so a refresh doesn't show it again
    router.replace("/login");
  }, [error, router, toast]);

  return null;
}
