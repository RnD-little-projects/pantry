"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { registerAction } from "./actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/utils";

export function RegisterForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (username.length < 3) {
      toast("Username must be at least 3 characters.", "error");
      setIsLoading(false);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, "error");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast("Passwords do not match", "error");
      setIsLoading(false);
      return;
    }

    try {
      const result = await registerAction(formData);

      if (result?.success) {
        toast("Account created successfully! Redirecting…", "success");
        window.location.href = "/";
        return;
      }

      if (result?.error) {
        toast(result.error, "error");
      }
    } catch (error) {
      toast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="username">Username</label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          spellCheck={false}
          type="text"
          minLength={3}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="email">Email (optional)</label>
        <Input
          id="email"
          name="email"
          autoComplete="email"
          spellCheck={false}
          type="email"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="password">Password</label>
        <Input
          id="password"
          name="password"
          autoComplete="new-password"
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="confirmPassword">Confirm password</label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          disabled={isLoading}
        />
      </div>
      <Button 
        type="button" 
        onClick={(e) => {
          const form = e.currentTarget.closest("form");
          if (!form) return;

          const formData = new FormData(form);
          const username = String(formData.get("username") ?? "").trim();
          const password = String(formData.get("password") ?? "");
          const confirmPassword = String(formData.get("confirmPassword") ?? "");

          if (username.length < 3) {
            toast("Username must be at least 3 characters.", "error");
            return;
          }

          if (password.length < MIN_PASSWORD_LENGTH) {
            toast(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, "error");
            return;
          }

          if (password !== confirmPassword) {
            toast("Passwords do not match", "error");
            return;
          }

          form.requestSubmit();
        }}
        className="w-full" 
        disabled={isLoading}
      >
        {isLoading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
