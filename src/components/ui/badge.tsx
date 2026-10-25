import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "highlight";

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-current text-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border text-muted-foreground",
  success: "border-current text-success",
  highlight: "border-current text-highlight",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border-2 px-1.5 py-px font-mono text-[11px] font-bold uppercase tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
