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
  const hasOngoingOrder = sessions.some((s) => s.status !== "archived");
  const isStartPage = pathname === "/";
  const showCreateButton = !isStartPage && !hasOngoingOrder;

  return (
    <div className={cn(
      "mt-4 transition-all duration-300 overflow-hidden",
      collapsed ? "w-0 opacity-0 pointer-events-none" : "w-[188px] opacity-100"
    )}>
      <div className="w-[188px] space-y-3 px-1">
        {showCreateButton && (
          <div className="mb-3 pb-2 border-b border-border/40">
            <Link
              href="/"
              className="flex items-center gap-2 py-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-[10px]">
                +
              </span>
              <span>Create new order</span>
            </Link>
          </div>
        )}
        <div className="space-y-3">
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
    </div>
  );
}
