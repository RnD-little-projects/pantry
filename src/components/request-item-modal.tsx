"use client";

import { useEffect, useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";

import {
  getItemRequestsAction,
  submitItemRequestAction,
  toggleItemRequestLikeAction,
  type PublicItemRequest,
} from "@/app/request-feedback-actions";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/toast";

const STATUS_BADGE = {
  pending: { variant: "outline", label: "Pending" },
  available: { variant: "success", label: "Available" },
  unavailable: { variant: "highlight", label: "Unavailable" },
  added: { variant: "default", label: "Added" },
} as const;

const SORTS = [
  ["wanted", "Most wanted"],
  ["newest", "Newest"],
  ["mine", "Mine & liked"],
] as const;
type Sort = (typeof SORTS)[number][0];

const STATUS_ORDER = { pending: 0, available: 1, unavailable: 2, added: 3 } as const;

function compare(sort: Sort) {
  return (a: PublicItemRequest, b: PublicItemRequest) =>
    sort === "newest"
      ? b.createdAt.localeCompare(a.createdAt)
      : STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.wants - a.wants || b.createdAt.localeCompare(a.createdAt);
}

const chipClass = (on: boolean) =>
  cn(
    "inline-flex h-9 items-center rounded-control border px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    on ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-foreground/5",
  );

// One place to ask the store for an item and to back other people's requests
export function RequestItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [sort, setSort] = useState<Sort>("wanted");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<PublicItemRequest[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getItemRequestsAction()
      .then((rows) => !cancelled && setRequests(rows))
      .catch(() => !cancelled && setRequests([]));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const needle = query.trim().replace(/\s+/g, " ").toLowerCase();
  const all = requests ?? [];
  // Same rule as the server: an open request with this exact name gets a like, not a duplicate
  const exact = all.find((r) => r.normalizedName === needle && r.status !== "added");
  const shown = all
    .filter((r) => {
      if (needle) return r.normalizedName.includes(needle);
      if (sort === "mine") return r.mine || r.likedByMe;
      // Added items are in the market list already, so hide other people's unless searched for
      return r.status !== "added" || r.mine;
    })
    .sort(compare(sort));

  const setLike = (id: string, liked: boolean) =>
    setRequests((rows) =>
      rows?.map((r) => (r.id === id ? { ...r, likedByMe: liked, wants: r.wants + (liked ? 1 : -1) } : r)) ?? rows,
    );

  const toggleLike = async (request: PublicItemRequest) => {
    setLike(request.id, !request.likedByMe);
    const result = await toggleItemRequestLikeAction(request.id);
    if (!result.success) {
      setLike(request.id, request.likedByMe);
      toast(result.error, "error");
    }
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!needle) return;
    if (exact) {
      if (!exact.mine && !exact.likedByMe) void toggleLike(exact);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await submitItemRequestAction({ name: query, note });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast(result.liked ? `You want ${query.trim()} too` : `Request sent: ${query.trim()}`, "success");
      setQuery("");
      setNote("");
      setRequests(await getItemRequestsAction());
    });
  };

  let emptyMessage = "No requests yet. Be the first.";
  if (needle) emptyMessage = "Nobody has asked for this yet. Request it above.";
  else if (sort === "mine") emptyMessage = "You haven't requested or liked anything yet.";

  return (
    <Dialog
      wide
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title="Item requests"
      description="Like what you want too. The more people want it, the sooner staff check. Everyone can see requests."
    >
      {/* Stays in view while the cards scroll under it */}
      <div className="sticky top-0 z-10 -mx-6 space-y-3 border-b-2 border-foreground bg-card px-6 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={submit} className="flex flex-1 gap-2">
            <Label htmlFor="request-name" className="sr-only">
              What do you want?
            </Label>
            <Input
              id="request-name"
              type="search"
              value={query}
              maxLength={80}
              autoComplete="off"
              placeholder="What do you want? Type to search or request…"
              onChange={(e) => {
                setQuery(e.target.value);
                setError("");
              }}
            />
            <Button type="submit" className="shrink-0" disabled={pending || !needle || Boolean(exact)}>
              {pending ? "Sending…" : "Request"}
            </Button>
          </form>
          <div role="group" aria-label="Sort" className="flex flex-wrap gap-2">
            {SORTS.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={sort === value} className={chipClass(sort === value)} onClick={() => setSort(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {needle && !exact && (
          <div className="space-y-2">
            <Label htmlFor="request-note">Note for “{query.trim()}” (optional)</Label>
            <Input
              id="request-note"
              value={note}
              maxLength={300}
              autoComplete="off"
              placeholder="Brand, size, or what it's for"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
        {exact && (
          <p className="text-sm text-muted-foreground">
            {exact.mine
              ? "You already requested this. It's below."
              : exact.likedByMe
                ? "Already requested, and you want it too."
                : "Already requested. Tap “I want this too” below so staff know."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* Fixed minimum height so the dialog doesn't jump around while typing filters the cards */}
      <section aria-label="Requests" className="-mx-6 -mb-8 min-h-[60dvh] bg-muted px-6 py-4">
        {requests === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "flex flex-col gap-2 rounded-control border bg-card p-4",
                  r === exact ? "border-foreground" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={STATUS_BADGE[r.status].variant}>{STATUS_BADGE[r.status].label}</Badge>
                  <span className="truncate font-mono text-xs text-muted-foreground">{r.mine ? "you" : r.requester}</span>
                </div>
                <h3 className="break-words font-display text-lg">{r.name}</h3>
                {r.note && <p className="break-words text-[13px] text-muted-foreground">“{r.note}”</p>}
                {r.staffNote && <p className="break-words text-[13px]">Staff: “{r.staffNote}”</p>}
                <div className="flex-1" />
                {r.mine || r.status === "added" ? (
                  <p className="flex h-10 items-center justify-center rounded-control border border-dashed border-border text-sm text-muted-foreground">
                    {r.status === "added" ? "Now in the market list" : "Your request"} · {r.wants} want it
                  </p>
                ) : (
                  <button
                    type="button"
                    aria-pressed={r.likedByMe}
                    onClick={() => toggleLike(r)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-control border text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      r.likedByMe
                        ? "border-highlight bg-highlight text-highlight-foreground"
                        : "border-input text-foreground hover:bg-foreground/5",
                    )}
                  >
                    <ThumbsUp aria-hidden="true" className={cn("h-4 w-4", r.likedByMe && "fill-current")} />
                    {r.likedByMe ? "You want this" : "I want this too"} · <span className="font-mono">{r.wants}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialog>
  );
}
