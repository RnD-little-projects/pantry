"use client";

import Link from "next/link";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

export type ThemeMode = "system" | "light" | "dark";

type AccountMenuProps = {
  collapsed: boolean;
  open: boolean;
  themeMode: ThemeMode;
  onOpenChange: (open: boolean) => void;
  onThemeChange: (mode: ThemeMode) => void;
  userRole?: string;
};

export function AccountMenu({
  collapsed,
  open,
  themeMode,
  onOpenChange,
  onThemeChange,
  userRole,
}: AccountMenuProps) {
  return (
    <div className="relative">
      <Button
        variant="outline"
        className={cn("w-full", collapsed ? "justify-center px-0" : "justify-between")}
        aria-label="Open account menu"
        onClick={() => onOpenChange(!open)}
      >
        <span aria-hidden="true" className="text-lg w-9 shrink-0 flex justify-center">👤</span>
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          collapsed ? "w-0 opacity-0" : "w-[140px] opacity-100"
        )}>
          <div className="w-[140px] flex items-center justify-between pl-2">
            <span className="whitespace-nowrap">Account</span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground whitespace-nowrap">Menu</span>
          </div>
        </div>
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-50 rounded-[1.5rem] border border-border/70 bg-card/95 p-3 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="px-2 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-muted-foreground">Preference theme</p>
              <div className="mt-3 grid grid-cols-3 gap-1">
                {(["system", "light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "flex items-center justify-center rounded-lg border py-2 text-[9px] font-bold uppercase transition",
                      themeMode === mode
                        ? "border-primary/35 bg-primary/15 text-foreground"
                        : "border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => onThemeChange(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 border-t border-border/60 pt-3">
              {userRole === "admin" && (
                <>
                  <Link
                    href="/admin/orders"
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium text-primary transition hover:bg-primary/5"
                    onClick={() => onOpenChange(false)}
                  >
                    <span>Manage Orders</span>
                    <span className="text-[10px] uppercase tracking-[0.28em]">Admin</span>
                  </Link>
                  <Link
                    href="/admin/products"
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium text-primary transition hover:bg-primary/5"
                    onClick={() => onOpenChange(false)}
                  >
                    <span>Manage Products</span>
                    <span className="text-[10px] uppercase tracking-[0.28em]">Admin</span>
                  </Link>
                </>
              )}
              {[
                "Logout",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                >
                  <span>{item}</span>
                  <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Open</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
