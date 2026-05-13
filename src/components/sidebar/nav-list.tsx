"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import type { WorkspaceSession } from "../../lib/pantry-types";

type NavListProps = {
  collapsed: boolean;
  sessions: ReadonlyArray<WorkspaceSession>;
};

export function SessionList({ collapsed, sessions }: Readonly<NavListProps>) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "mt-4 transition-all duration-300 overflow-hidden",
      collapsed ? "w-0 opacity-0 pointer-events-none" : "w-[188px] opacity-100"
    )}>
      <div className="w-[188px] space-y-3 px-1">
        {sessions.map((session) => {
          const href = session.publicId ? `/order-list/${session.publicId}` : "#";
          const isActive = pathname === href;

          return (
            <Link
              key={session.id ?? session.publicId ?? session.title}
              href={href}
              className={cn(
                "block w-full text-left transition-colors duration-200",
                isActive
                  ? "text-foreground font-bold"
                  : "text-foreground/50 font-normal hover:text-foreground",
              )}
            >
              <span className={cn(
                "truncate text-sm tracking-wide transition-all",
                session.status === "archived" && "line-through opacity-60 text-muted-foreground"
              )}>
                {session.title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
