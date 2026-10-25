"use client";

import Link from "next/link";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

type BrandProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function ShellBrand({ collapsed, onToggle }: Readonly<BrandProps>) {
  return (
    <div className="relative flex w-full items-center">
      <div className={cn(
        "overflow-hidden transition-[width,opacity] duration-300 motion-reduce:transition-none",
        collapsed ? "w-0 opacity-0" : "w-[140px] opacity-100"
      )}>
        <Link href="/" className="w-[140px] block hover:opacity-80 transition-opacity">
          <p className="font-display whitespace-nowrap text-2xl">Pantry</p>
        </Link>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-9 w-9 shrink-0 px-0 z-50",
          collapsed ? "mx-auto" : "ml-auto"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300"
          style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </Button>
    </div>
  );
}
