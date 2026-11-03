"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { changePassword } from "@/app/auth-actions";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/utils";

export default function ForcePasswordChangeForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      toast(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`, "error");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast("Passwords do not match", "error");
      setLoading(false);
      return;
    }

    try {
      const result = await changePassword(formData);
      if (result.error) {
        toast(result.error, "error");
        setLoading(false);
      } else {
        toast("Password Updated successfully.", "success");
        // Redirect to dashboard now that the token is updated
        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    } catch {
      toast("Something went wrong. Try again.", "error");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 w-fit rounded-full bg-highlight p-3 text-highlight-foreground">
            <Lock aria-hidden="true" className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>
            An admin reset your password. Choose a new one to continue.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  name="newPassword" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-3 rounded-control bg-muted p-3">
              <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Passwords must be at least {MIN_PASSWORD_LENGTH} characters. Use a mix of letters, numbers, and symbols for better security.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="button" 
              onClick={(e) => {
                const form = e.currentTarget.closest("form");
                if (!form) return;
                
                const formData = new FormData(form);
                const password = formData.get("newPassword") as string;
                const confirmPassword = formData.get("confirmPassword") as string;

                if (!password || password.length < MIN_PASSWORD_LENGTH) {
                  toast(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`, "error");
                  return;
                }

                if (password !== confirmPassword) {
                  toast("Passwords do not match", "error");
                  return;
                }

                form.requestSubmit();
              }}
              size="lg" className="w-full"
              disabled={loading}
            >
              {loading ? "Saving…" : "Save and continue"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
