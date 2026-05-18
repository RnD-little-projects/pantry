
"use client";

import Link from "next/link";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { logoutAction, attachGoogleAction, changeEmailAction } from "@/app/auth-actions";
import { useState, useEffect } from "react";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Mail, Shield, Key, LogOut, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export type ThemeMode = "system" | "light" | "dark";

type UserProfile = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
};

type AccountMenuProps = {
  collapsed: boolean;
  open: boolean;
  themeMode: ThemeMode;
  onOpenChange: (open: boolean) => void;
  onThemeChange: (mode: ThemeMode) => void;
  userRole?: string;
  user?: UserProfile;
};

export function AccountMenu({
  collapsed,
  open,
  themeMode,
  onOpenChange,
  onThemeChange,
  userRole,
  user,
}: AccountMenuProps) {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // Sync email input when user prop changes
  useEffect(() => {
    if (user?.email) {
      setEmailInput(user.email);
    }
  }, [user?.email]);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    setEmailSuccess("");

    const formData = new FormData();
    formData.append("email", emailInput);

    try {
      const res = await changeEmailAction(formData);
      if (res.success) {
        setEmailSuccess("Email updated successfully!");
        setEditingEmail(false);
      }
    } catch (err: any) {
      setEmailError(err.message || "Failed to update email");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        className={cn("w-full", collapsed ? "justify-center px-0" : "justify-between")}
        aria-label="Open account menu"
        onClick={() => onOpenChange(true)}
      >
        <span aria-hidden="true" className="text-lg w-9 shrink-0 flex justify-center">
          {user?.image ? (
            <img src={user.image} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            "👤"
          )}
        </span>
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          collapsed ? "w-0 opacity-0" : "w-[140px] opacity-100"
        )}>
          <div className="w-[140px] flex items-center justify-between pl-2">
            <span className="truncate font-medium text-sm">{user?.name || "Account"}</span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground whitespace-nowrap">
              {user?.role || "Menu"}
            </span>
          </div>
        </div>
      </Button>

      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Account Profile"
        description="Manage your profile details, theme preferences, and security settings."
      >
        <div className="space-y-6 py-2">
          {/* User Profile Header */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-muted/20 backdrop-blur-sm">
            <div className="relative shrink-0">
              {user?.image ? (
                <img src={user.image} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl shadow-sm">
                  👤
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground truncate">{user?.name || "Guest User"}</h3>
                <Badge variant="outline" className="uppercase text-[9px] font-bold tracking-wider px-2 py-0.5">
                  {user?.role || userRole || "User"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ? user.email : "No email connected"}
              </p>
            </div>
          </div>

          {/* Email Management Section */}
          <div className="space-y-3 p-4 rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span>Email Address</span>
              </div>
              {!editingEmail && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs font-medium text-primary hover:bg-primary/10"
                  onClick={() => { setEditingEmail(true); setEmailError(""); setEmailSuccess(""); }}
                >
                  {user?.email ? "Change" : "Add Email"}
                </Button>
              )}
            </div>

            {!editingEmail ? (
              <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border/40">
                <span className={cn("text-xs truncate", !user?.email && "text-muted-foreground italic")}>
                  {user?.email ? user.email : "No email address linked to this account."}
                </span>
                {user?.email && (
                  <Badge variant="secondary" className="text-[10px] gap-1 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </Badge>
                )}
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your email address"
                    disabled={emailLoading}
                    required
                    className="h-9 text-xs bg-background"
                  />
                  <Button type="submit" size="sm" disabled={emailLoading} className="h-9 px-4 shrink-0">
                    {emailLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setEditingEmail(false); setEmailError(""); setEmailSuccess(""); setEmailInput(user?.email || ""); }} 
                    disabled={emailLoading}
                    className="h-9 px-3 shrink-0"
                  >
                    Cancel
                  </Button>
                </div>
                {emailError && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
              </form>
            )}
            {emailSuccess && !editingEmail && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}
          </div>

          {/* Google Account Connection */}
          <div className="space-y-2">
            <form action={attachGoogleAction}>
              <Button
                type="submit"
                variant="outline"
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 h-auto text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground border border-border/60 group shadow-sm hover:border-primary/40"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98. p.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Connect Google Account
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground group-hover:text-primary transition-colors">
                  OAuth
                </span>
              </Button>
            </form>
          </div>

          {/* Theme Preferences */}
          <div className="space-y-2 p-4 rounded-2xl border border-border/60 bg-card shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-muted-foreground">Theme Preference</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["system", "light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "flex items-center justify-center rounded-xl border py-2.5 text-xs font-bold uppercase transition shadow-sm",
                    themeMode === mode
                      ? "border-primary/50 bg-primary/15 text-foreground ring-2 ring-primary/20"
                      : "border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => onThemeChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Actions & Administration */}
          <div className="space-y-2 border-t border-border/60 pt-4">
            {(userRole === "admin" || userRole === "cashier") && (
              <>
                <Link
                  href="/admin/orders"
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-primary/10 border border-primary/20 bg-primary/5 shadow-sm"
                  onClick={() => onOpenChange(false)}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Manage Orders</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.28em]">Admin</span>
                </Link>
                <Link
                  href="/admin/products"
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-primary/10 border border-primary/20 bg-primary/5 shadow-sm"
                  onClick={() => onOpenChange(false)}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Manage Products</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.28em]">Admin</span>
                </Link>
              </>
            )}

            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground border border-border/40 shadow-sm"
              onClick={() => {
                setPasswordModalOpen(true);
                onOpenChange(false);
              }}
            >
              <span className="flex items-center gap-2 font-medium">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span>Change Password</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Security</span>
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm text-destructive hover:bg-destructive/10 transition border border-destructive/20 bg-destructive/5 shadow-sm font-medium"
              onClick={async () => {
                await logoutAction();
              }}
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.28em]">Action</span>
            </button>
          </div>
        </div>
      </Dialog>

      <ChangePasswordModal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} />
    </div>
  );
}
