import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Table({ className, containerClassName, ...props }: Readonly<TableHTMLAttributes<HTMLTableElement> & { containerClassName?: string }>) {
  return (
    <div className={cn("relative w-full overflow-auto", containerClassName)}>
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: Readonly<HTMLAttributes<HTMLTableSectionElement>>) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: Readonly<HTMLAttributes<HTMLTableSectionElement>>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: Readonly<HTMLAttributes<HTMLTableRowElement>>) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors hover:bg-white/[0.03] data-[state=selected]:bg-white/[0.04]",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: Readonly<HTMLAttributes<HTMLTableCellElement>>) {
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: Readonly<TdHTMLAttributes<HTMLTableCellElement>>) {
  return <td className={cn("p-4 align-middle text-sm text-foreground", className)} {...props} />;
}

export function TableFooter({ className, ...props }: Readonly<HTMLAttributes<HTMLTableSectionElement>>) {
  return (
    <tfoot
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}
