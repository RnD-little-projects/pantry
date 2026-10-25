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
      "mt-4 overflow-hidden transition-[width,opacity] duration-300 motion-reduce:transition-none",
      collapsed ? "w-0 opacity-0 pointer-events-none" : "w-[188px] opacity-100"
    )}>
      <div className="w-[188px] space-y-3 px-1">
        {showCreateButton && (
          <div className="mb-3 border-b border-border pb-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-control border-2 border-dashed border-input px-2 py-2 text-sm font-bold transition-colors hover:bg-card/60"
            >
              <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center text-base">
                +
              </span>
              <span>New order</span>
            </Link>
          </div>
        )}
        <div className="space-y-0.5">
          {sessions.map((session) => {
            const href = session.publicId ? `/order-list/${session.publicId}` : "#";
            const isActive = pathname === href;

            return (
              <Link
                key={session.id ?? session.publicId ?? session.title}
                href={href}
                className={cn(
                  "block w-full rounded-control px-2 py-2 text-left transition-colors",
                  isActive
                    ? "bg-card font-bold text-card-foreground"
                    : "text-foreground/75 hover:bg-card/60 hover:text-foreground",
                )}
              >
                <span className={cn(
                  "block truncate font-mono text-[13px]",
                  session.status === "archived" && "text-muted-foreground line-through"
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
