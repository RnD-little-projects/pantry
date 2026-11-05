"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { setFeedbackStatusAction } from "./actions";

export type FeedbackItem = {
  id: string;
  username: string;
  category: "bug" | "idea" | "other";
  rating: number | null;
  message: string;
  page: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

const CATEGORY_VARIANT = { bug: "highlight", idea: "success", other: "outline" } as const;
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function FeedbackClient({ items }: { items: FeedbackItem[] }) {
  const { toast } = useToast();
  const [view, setView] = useState<"inbox" | "archived">("inbox");
  const [pending, startTransition] = useTransition();

  const inbox = items.filter((i) => i.status !== "archived");
  const archived = items.filter((i) => i.status === "archived");
  const rows = view === "inbox" ? inbox : archived;

  const setStatus = (item: FeedbackItem, status: FeedbackItem["status"]) => {
    startTransition(async () => {
      const result = await setFeedbackStatusAction(item.id, status);
      if (!result.success) toast("Couldn't update that feedback. Try again.", "error");
    });
  };

  return (
    <div className="w-full max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">Only admins can see this page.</p>
        </div>
        <div role="group" aria-label="Show" className="flex gap-2">
          {([["inbox", "Inbox", inbox.length], ["archived", "Archived", archived.length]] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-control border px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                view === value ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-foreground/5",
              )}
            >
              {label}
              <span className="tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="receipt px-4 py-10 text-center text-sm text-muted-foreground">
          {view === "inbox" ? "No feedback yet." : "Nothing archived."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((item) => (
            <li
              key={item.id}
              className={cn("receipt space-y-3 border-t-4 p-4", item.status === "new" ? "border-t-highlight" : "border-t-border")}
            >
              <div className="flex flex-wrap items-center gap-2">
                {item.status === "new" && <Badge variant="highlight">New</Badge>}
                <Badge variant={CATEGORY_VARIANT[item.category]}>{item.category}</Badge>
                {item.rating && <span className="font-mono text-[13px] text-muted-foreground">{item.rating} / 5</span>}
                <span className="ml-auto font-mono text-[13px] text-muted-foreground">
                  {item.username} · {dateFormat.format(new Date(item.createdAt))}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{item.message}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">{item.page ? `from ${item.page}` : ""}</span>
                <div className="flex gap-2">
                  {item.status === "new" && (
                    <Button size="sm" disabled={pending} onClick={() => setStatus(item, "read")}>Mark read</Button>
                  )}
                  {item.status === "archived" ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(item, "read")}>Move to inbox</Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(item, "archived")}>Archive</Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
