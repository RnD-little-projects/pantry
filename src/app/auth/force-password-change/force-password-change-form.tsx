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

export default function ForcePasswordChangeForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await changePassword(formData);
      if (result.success) {
        toast("Password Updated successfully.", "success");
        // Redirect to dashboard now that the token is updated
        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    } catch (error: any) {
      toast(error.message, "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(0,0,0,1)_100%)] z-0" />
      
      <Card className="w-full max-w-md relative z-10 border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-amber-500/10 p-3 rounded-full w-fit mb-4 border border-amber-500/20">
            <Lock className="h-6 w-6 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Change Password</CardTitle>
          <CardDescription className="text-slate-400">
            An admin has reset your password. You must set a new secure password to continue.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-amber-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-amber-500"
                />
              </div>
            </div>
            
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 flex gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Passwords must be at least 6 characters. Use a mix of letters, numbers, and symbols for better security.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-6"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password & Continue"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
