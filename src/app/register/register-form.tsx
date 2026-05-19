"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registerAction } from "./actions";

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

    if (password.length < 8) {
      toast("Password must be at least 8 characters.", "error");
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
        toast("Account created successfully! Redirecting...", "success");
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
        <label className="text-sm font-medium" htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          minLength={3}
          required
          disabled={isLoading}
          className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">Email (optional)</label>
        <input
          id="email"
          name="email"
          type="email"
          disabled={isLoading}
          className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          disabled={isLoading}
          className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={8}
          required
          disabled={isLoading}
          className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary disabled:opacity-50"
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

          if (password.length < 8) {
            toast("Password must be at least 8 characters.", "error");
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
        {isLoading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
