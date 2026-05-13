"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

import type { MarketItem, WorkspaceSession } from "../lib/pantry-types";

import { Button } from "./ui/button";
import { cn } from "../lib/utils";

// Sub-components
import { ShellBrand } from "./sidebar/brand";
import { SessionList } from "./sidebar/nav-list";
import { AccountMenu, type ThemeMode } from "./sidebar/account-menu";
import { MarketModal } from "./market-modal";

type PantryLayoutProps = {
  active: "overview" | "market";
  children: ReactNode;
  sessions?: ReadonlyArray<WorkspaceSession>;
  marketItems?: ReadonlyArray<MarketItem>;
  showSidebar?: boolean;
  userRole?: string;
};

/**
 * PantryLayout
 * 
 * The primary application shell that provides the sidebar navigation, 
 * theme management, and responsive layout grid.
 */

export function PantryLayout({
  active,
  children,
  sessions = [],
  marketItems = [],
  showSidebar = true,
  userRole,
}: Readonly<PantryLayoutProps>) {
  const [collapsed, setCollapsed] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const themeMode = (theme as ThemeMode) || "system";
  const setThemeMode = (mode: ThemeMode) => setTheme(mode);

  const sidebarTitle = active === "market" ? "Market" : "Order list";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when screen resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Background Grid Pattern */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(var(--grid-color)_1px,transparent_1px),linear-gradient(90deg,var(--grid-color)_1px,transparent_1px)] bg-[size:72px_72px] opacity-100" />

      {showSidebar && (
        <div className="flex items-center justify-between border-b border-border/70 bg-card/90 backdrop-blur-xl p-4 sticky top-0 z-40 lg:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">{sidebarTitle}</p>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </Button>
        </div>
      )}

      <div
        className={cn(
          "relative grid min-h-screen w-full transition-[grid-template-columns] duration-300",
          showSidebar ? (collapsed ? "lg:grid-cols-[64px_minmax(0,1fr)]" : "lg:grid-cols-[220px_minmax(0,1fr)]") : "grid-cols-1"
        )}
      >
        {/* Mobile Overlay */}
        {showSidebar && (
          <div 
            className={cn(
              "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300",
              mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Section */}
        {showSidebar && (
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border/70 bg-card/95 py-5 backdrop-blur-xl transition-all duration-300 lg:sticky lg:top-0 lg:translate-x-0 overflow-x-hidden",
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
              collapsed ? "w-[64px] px-2" : "w-[280px] sm:w-[320px] lg:w-[220px] px-4",
            )}
          >
            <ShellBrand
              collapsed={collapsed}
              onToggle={() => {
                setAccountOpen(false);
                setCollapsed((value) => !value);
              }}
            />

            {/* Scrollable Navigation Area */}
            <div className={cn("mt-5 flex-1 overflow-y-auto no-scrollbar pr-1 transition-all duration-300", collapsed && "pr-0")}>
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-[188px] opacity-100"
              )}>
                <div className="w-[188px] space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">{sidebarTitle}</p>
                    {active !== "market" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.location.href = "/?new=true";
                        }}
                      >
                        + New
                      </Button>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {active === "market" ? "Review catalog prices and item notes." : "Tap any order list to open it."}
                  </p>
                </div>
              </div>

              <div onClick={() => setMobileMenuOpen(false)}>
                <SessionList collapsed={collapsed} sessions={sessions} />
              </div>
            </div>

            {/* Sidebar Footer Actions */}
            <div className="mt-5 space-y-3 border-t border-border/60 pt-4 shrink-0">
              <Button
                variant="secondary"
                className={cn("w-full", collapsed ? "justify-center px-0" : "justify-between px-2")}
                aria-label="Open market list"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMarketOpen(true);
                }}
              >
                <span aria-hidden="true" className="text-lg w-9 shrink-0 flex justify-center">🛒</span>
                <div className={cn(
                  "overflow-hidden transition-all duration-300",
                  collapsed ? "w-0 opacity-0" : "w-[155px] opacity-100"
                )}>
                  <div className="w-[155px] flex items-center pl-2">
                    <span className="whitespace-nowrap">Market list</span>
                  </div>
                </div>
              </Button>

              <AccountMenu
                collapsed={collapsed}
                open={accountOpen}
                themeMode={themeMode}
                onOpenChange={setAccountOpen}
                onThemeChange={setThemeMode}
                userRole={userRole}
              />
            </div>
          </aside>
        )}

        {/* Content Area Section */}
        <section className="flex min-w-0 flex-1">
          <div className="flex min-h-[calc(100vh-65px)] lg:min-h-screen w-full flex-col px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
              {children}
            </div>
          </div>
        </section>
      </div>

      {/* Overlays */}
      <MarketModal open={marketOpen} onClose={() => setMarketOpen(false)} marketItems={marketItems} />
    </main>
  );
}
