"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { answerRequestAction } from "./actions";

export type StaffRequest = {
  id: string;
  name: string;
  status: "pending" | "available" | "unavailable" | "added";
  note: string;
  staffNote: string;
  /** Requester first, then everyone who liked it */
  requesters: string[];
  createdAt: string;
};

const TABS = [
  ["pending", "Pending"],
  ["available", "Available"],
  ["unavailable", "Unavailable"],
] as const;

// Older requests were marked "added" before Available started adding the product itself
const inTab = (r: StaffRequest, tab: StaffRequest["status"]) => r.status === tab || (tab === "available" && r.status === "added");

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function RequestsClient({ requests }: { requests: StaffRequest[] }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<StaffRequest["status"]>("pending");
  const [answering, setAnswering] = useState<{ group: StaffRequest; status: "available" | "unavailable" } | null>(null);
  const [staffNote, setStaffNote] = useState("");
  const [pending, startTransition] = useTransition();

  const rows = requests.filter((g) => inTab(g, tab));

  const openAnswer = (group: StaffRequest, status: "available" | "unavailable") => {
    setStaffNote("");
    setAnswering({ group, status });
  };

  const submitAnswer = () => {
    if (!answering) return;
    const { group, status } = answering;
    startTransition(async () => {
      const result = await answerRequestAction(group.id, status, staffNote);
      if (!result.success) {
        toast(`Couldn't save the answer for ${group.name}. Try again.`, "error");
        return;
      }
      toast(status === "available" ? `${group.name} is available and in the product list` : `${group.name} marked unavailable`, "success");
      setAnswering(null);
    });
  };

  return (
    <div className="w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Item requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Things people asked for. Check the store, then answer.</p>
        </div>
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-control border px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                tab === value ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-foreground/5",
              )}
            >
              {label}
              <span className="tabular-nums">{requests.filter((g) => inTab(g, value)).length}</span>
            </button>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="receipt px-4 py-10 text-center text-sm text-muted-foreground">
          {tab === "pending" ? "No requests waiting. You're all caught up." : "Nothing here yet."}
        </p>
      ) : (
        <div className="receipt">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Asked by</TableHead>
                <TableHead>{tab === "pending" ? "Notes" : "Staff note"}</TableHead>
                <TableHead>Latest</TableHead>
                {tab !== "available" && <TableHead className="text-right">Answer</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((group) => (
                <TableRow key={group.id} className="align-top">
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[15px] font-bold">{group.name}</span>
                      {group.requesters.length > 1 && <Badge variant="highlight">{group.requesters.length} want this</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{group.requesters.join(", ")}</TableCell>
                  <TableCell className="max-w-xs break-words text-muted-foreground">
                    {(tab === "pending" ? (group.note && `“${group.note}”`) : group.staffNote) || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">
                    {dateFormat.format(new Date(group.createdAt))}
                  </TableCell>
                  {tab !== "available" && (
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        {/* An unavailable item can turn up later, so it can still be marked available */}
                        <Button size="sm" variant="outline" className="text-success" disabled={pending} onClick={() => openAnswer(group, "available")}>
                          Available…
                        </Button>
                        {tab === "pending" && (
                          <Button size="sm" variant="outline" className="text-highlight" disabled={pending} onClick={() => openAnswer(group, "unavailable")}>
                            Unavailable…
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={answering !== null}
        onOpenChange={(open) => !open && setAnswering(null)}
        title={answering ? `${answering.status === "available" ? "Available" : "Unavailable"}: ${answering.group.name}` : ""}
        description={
          answering
            ? `All users see this answer, including the ${answering.group.requesters.length} who want it.${answering.status === "available" ? " It's also added to the product list." : ""}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setAnswering(null)}>Cancel</Button>
            <Button variant={answering?.status === "unavailable" ? "highlight" : "default"} disabled={pending} onClick={submitAnswer}>
              {pending ? "Saving…" : `Mark ${answering?.status ?? ""}`}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="staff-note">Note to the customer (optional)</Label>
          <Input
            id="staff-note"
            value={staffNote}
            maxLength={300}
            onChange={(e) => setStaffNote(e.target.value)}
            placeholder={answering?.status === "unavailable" ? "Out of stock until Friday…" : "In the chiller, aisle 3…"}
          />
        </div>
      </Dialog>
    </div>
  );
}
