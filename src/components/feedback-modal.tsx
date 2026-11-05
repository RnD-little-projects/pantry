"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";

import { submitFeedbackAction } from "@/app/request-feedback-actions";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Label } from "./ui/label";
import { useToast } from "./ui/toast";

const CATEGORIES = [
  ["bug", "Bug"],
  ["idea", "Idea"],
  ["other", "Other"],
] as const;

const toggleClass = (on: boolean) =>
  cn(
    "h-11 rounded-control border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    on ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-foreground/5",
  );

export function FeedbackModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const pathname = usePathname();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number][0]>("idea");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await submitFeedbackAction({ category, rating, message, page: pathname });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast("Thanks! Your feedback was sent.", "success");
      setMessage("");
      setRating(null);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Send feedback" description="Only the admin reads this.">
      <form onSubmit={submit} className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Type</legend>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={category === value} className={toggleClass(category === value)} onClick={() => setCategory(value)}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Rating (optional)</legend>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} of 5`}
                aria-pressed={rating === n}
                className={cn(toggleClass(rating === n), "font-mono")}
                onClick={() => setRating(rating === n ? null : n)}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="feedback-message">Message</Label>
          <textarea
            id="feedback-message"
            value={message}
            rows={4}
            maxLength={2000}
            required
            placeholder="What should we fix or add?"
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-none rounded-control border border-dashed border-input bg-transparent px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:border-solid focus-visible:border-ring focus-visible:outline-none sm:text-sm"
          />
          <p className="text-right font-mono text-xs text-muted-foreground">{message.length} / 2000</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending || !message.trim()}>
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </form>
    </Dialog>
  );
}
