"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { changeOwnPassword } from "@/app/auth-actions";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await changeOwnPassword(formData);
      if (result.success) {
        toast("Password changed successfully.", "success");
        onOpenChange(false);
      }
    } catch (error: any) {
      toast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Change Password"
      description="Update your account password securely."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input 
            id="newPassword" 
            name="newPassword" 
            type="password" 
            required 
            placeholder="••••••••" 
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input 
            id="confirmPassword" 
            name="confirmPassword" 
            type="password" 
            required 
            placeholder="••••••••" 
            disabled={loading}
          />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
