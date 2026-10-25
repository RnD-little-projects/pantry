import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "highlight";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70",
  outline: "border-current bg-transparent text-inherit hover:bg-foreground/5",
  ghost: "border-transparent bg-transparent text-foreground hover:bg-muted",
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
  highlight: "border-transparent bg-highlight text-highlight-foreground hover:bg-highlight/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-4 py-2.5",
  sm: "h-9 px-3 text-[13px]",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0",
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
        "inline-flex touch-manipulation items-center justify-center gap-2 rounded-control border text-[15px] font-bold transition-colors duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
