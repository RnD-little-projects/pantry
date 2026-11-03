"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const messages: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Access denied",
    description: "This account doesn't have access to Pantry. Ask an admin to add you, or sign in with a different account.",
  },
  GoogleEmailInUse: {
    title: "Email already in use",
    description: "That Google email already belongs to a Pantry account. Sign in with your password, then link Google from the account menu.",
  },
  Configuration: {
    title: "Sign-in unavailable",
    description: "Sign-in isn't set up correctly right now. Try again later or use your username and password.",
  },
};

const fallback = {
  title: "Couldn't sign you in",
  description: "Something went wrong while signing in. Please try again.",
};

export function LoginErrorDialog({ error }: { error: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { title, description } = messages[error] ?? fallback;

  function close() {
    setOpen(false);
    // Drop ?error= so a refresh doesn't reopen the dialog
    router.replace("/login");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={title}
      description={description}
      footer={<Button onClick={close}>OK</Button>}
    />
  );
}
