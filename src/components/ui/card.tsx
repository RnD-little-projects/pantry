import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

export function Card({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-sheet border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: Readonly<HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }>) {
  return (
    <h3 className={cn("font-display text-lg leading-tight text-balance", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: Readonly<HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
