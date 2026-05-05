import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-transparent bg-primary text-primary-foreground shadow-[0_12px_30px_-14px_rgba(45,212,191,0.75)] hover:brightness-110",
  secondary: "border-border/70 bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border-border/80 bg-transparent text-foreground hover:bg-white/5",
  ghost: "border-transparent bg-transparent text-foreground hover:bg-white/5",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-4 py-2.5",
  sm: "h-9 px-3 text-xs",
  lg: "h-12 px-6 text-sm",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}