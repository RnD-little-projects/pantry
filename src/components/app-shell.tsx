"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { marketItems as fallbackMarketItems, workspaceSessions as fallbackSessions } from "../lib/pantry-data";
import type { MarketItem, WorkspaceSession } from "../lib/pantry-types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type ShellProps = {
  active: "overview" | "market";
  children: ReactNode;
  sessions?: ReadonlyArray<WorkspaceSession>;
  marketItems?: ReadonlyArray<MarketItem>;
  showSidebar?: boolean;
};

type ThemeMode = "system" | "light" | "dark";

function ShellBrand({ collapsed, onToggle }: Readonly<{ collapsed: boolean; onToggle: () => void }>) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-3",
        collapsed ? "flex-col justify-center" : "justify-start",
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_14px_34px_-14px_rgba(45,212,191,0.9)]">
        P
      </div>
      {collapsed ? null : (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">Pantry OS</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">Command Center</h1>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-9 w-9 shrink-0 px-0 text-xs z-50",
          collapsed
            ? "mt-1"
            : "ml-auto",
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        {collapsed ? ">" : "<"}
      </Button>
    </div>
  );
}

function SessionList({ collapsed, sessions }: Readonly<{ collapsed: boolean; sessions: ReadonlyArray<WorkspaceSession> }>) {
  if (collapsed) return null;

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <button
          key={session.id ?? session.publicId ?? session.title}
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all duration-200",
            session.active
              ? "border-primary/30 bg-primary/12 text-foreground shadow-[0_12px_24px_-16px_rgba(45,212,191,0.7)]"
              : "border-border/60 bg-white/[0.03] text-muted-foreground hover:border-border hover:bg-white/[0.06] hover:text-foreground",
          )}
        >
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-[11px] font-semibold",
              session.active ? "border-primary/35 bg-primary/18 text-primary-foreground" : "border-border/60 bg-black/10 text-foreground",
            )}
          >
            {session.isPublic === false ? "🔒" : "🌐"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-foreground">{session.title}</span>
              <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{session.updated}</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {session.isPublic === false ? "Private session" : "Public session"}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function AccountMenu({
  collapsed,
  open,
  themeMode,
  onOpenChange,
  onThemeChange,
}: {
  readonly collapsed: boolean;
  readonly open: boolean;
  readonly themeMode: ThemeMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly onThemeChange: (mode: ThemeMode) => void;
}) {
  return (
    <div className="relative">
      <Button
        variant="outline"
        className={cn("w-full justify-between", collapsed && "px-0")}
        aria-label="Open account menu"
        onClick={() => onOpenChange(!open)}
      >
        <span aria-hidden="true" className="text-lg">👤</span>
        <span className={cn(collapsed && "sr-only")}>Account</span>
        <span className={cn("text-[10px] uppercase tracking-[0.28em] text-muted-foreground", collapsed && "sr-only")}>Menu</span>
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
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["system", "light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] transition",
                      themeMode === mode
                        ? "border-primary/35 bg-primary/15 text-foreground"
                        : "border-border/70 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                    )}
                    onClick={() => onThemeChange(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 border-t border-border/60 pt-3">
              {[
                "Settings",
                "Account",
                "Logout",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
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

function MarketModal({
  open,
  onClose,
  marketItems,
}: Readonly<{ open: boolean; onClose: () => void; marketItems: ReadonlyArray<MarketItem> }>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close market list modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border/70 bg-card/96 shadow-[0_36px_100px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">Market list</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Item price list</h3>
            <p className="mt-2 text-sm text-muted-foreground">A quick modal view of item pricing without leaving the sidebar flow.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid grid-cols-[1.5fr_0.6fr_0.5fr] border-b border-border/60 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          <span>Item</span>
          <span className="text-right">Price</span>
          <span className="text-right">Status</span>
        </div>

        <div className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto">
          {marketItems.map((item) => (
            <div key={item.id ?? item.name} className="grid grid-cols-[1.5fr_0.6fr_0.5fr] items-center px-6 py-4 hover:bg-white/[0.03]">
              <div>
                <div className="font-medium text-foreground">{item.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
              </div>
              <div className="text-right font-mono text-sm text-muted-foreground">{item.price}</div>
              <div className="text-right">
                <Badge variant={item.status === "Fresh" ? "default" : "secondary"}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  active,
  children,
  sessions = fallbackSessions,
  marketItems = fallbackMarketItems,
  showSidebar = true,
}: Readonly<ShellProps>) {
  const [collapsed, setCollapsed] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  const sidebarTitle = active === "market" ? "Market" : "Sessions";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.12),_transparent_24%),linear-gradient(180deg,_#060b16_0%,_#09111f_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />

      {showSidebar ? (
        <div
          style={{
            gridTemplateColumns: collapsed ? "96px minmax(0, 1fr)" : "220px minmax(0, 1fr)",
          }}
          className="relative grid min-h-screen w-full transition-[grid-template-columns] duration-300"
        >
          <aside
            className={cn(
              "flex min-h-screen flex-col border-b border-border/70 bg-card/75 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r",
              collapsed ? "px-2" : "px-4",
            )}
          >
            <ShellBrand
              collapsed={collapsed}
              onToggle={() => {
                setAccountOpen(false);
                setCollapsed((value) => !value);
              }}
            />

            <div className={cn("mt-5 flex-1 overflow-y-auto pr-1", collapsed && "pr-0") }>
              {collapsed ? null : (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">{sidebarTitle}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {active === "market" ? "Review catalog prices and item notes." : "Tap any session to open it."}
                  </p>
                </div>
              )}

              <SessionList collapsed={collapsed} sessions={sessions} />
            </div>

            <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
              <Button
                variant="secondary"
                className={cn("w-full justify-between", collapsed && "px-2")}
                aria-label="Open market list"
                onClick={() => setMarketOpen(true)}
              >
                <span aria-hidden="true" className="text-lg">🛒</span>
                <span className={cn(collapsed && "sr-only")}>Market list</span>
                <Badge variant="outline" className={cn("border-border/60 bg-black/10 text-[9px] tracking-[0.22em]", collapsed && "sr-only")}>
                  Prices
                </Badge>
              </Button>

              <AccountMenu
                collapsed={collapsed}
                open={accountOpen}
                themeMode={themeMode}
                onOpenChange={setAccountOpen}
                onThemeChange={setThemeMode}
              />
            </div>
          </aside>

          <section className="flex min-w-0 flex-1">
            <div className="flex min-h-screen w-full flex-col px-4 py-4 sm:px-6 lg:px-8">
              <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
                {children}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="relative flex min-h-screen w-full flex-col px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">{children}</div>
        </section>
      )}

      <MarketModal open={marketOpen} onClose={() => setMarketOpen(false)} marketItems={marketItems} />
    </main>
  );
}