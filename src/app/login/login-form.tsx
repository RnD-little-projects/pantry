
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { signInAction } from "./actions";

export function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      const result = await signInAction(formData);
      
      if (result?.success) {
        toast("Successfully signed in! Redirecting...", "success");
        window.location.href = "/";
        return;
      }

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          toast("Invalid username or password. Please check your credentials or register if you don't have an account.", "error");
        } else {
          toast(result.error, "error");
        }
      }
    } catch (error) {
      toast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          disabled={isLoading}
          className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={isLoading}
          className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 outline-none ring-0 focus:border-primary disabled:opacity-50"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
