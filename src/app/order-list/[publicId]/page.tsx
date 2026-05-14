import { auth } from "@/auth";
import { PantryLayout } from "@/components/pantry-layout";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PublicShareToggle } from "@/components/public-share-toggle";
import { getMarketItems, getOrderHistory, getOverviewSessions, getSharedOrder } from "@/lib/pantry-db";
import { redirect } from "next/navigation";
import Image from "next/image";
import { OrderItemComposer } from "./order-item-composer";
import { EditableQuantityCell } from "./editable-quantity-cell";
import { DeleteItemButton } from "./delete-item-button";
import { UndoActionButton } from "./undo-action-button";
import { ArchiveOrderDialog } from "./archive-order-dialog";
import { ActivityLogMobileModal } from "./activity-log-modal";
import { Image as ImageIcon, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

type SessionPageProps = {
  params: Promise<{
    publicId: string;
  }>;
  searchParams: Promise<{
    role?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function SessionPage({ params, searchParams }: Readonly<SessionPageProps>) {
  const session = await auth();
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  
  const publicId = resolvedParams.publicId || "demo-share-link";
  const role = getFirstParam(resolvedSearchParams.role) || "viewer";
  const canPrice = role === "cashier";
  const showSidebar = !!session;

  let order;
  let historyItems;
  let sessions;
  let marketItems;
  try {
    [order, historyItems, sessions, marketItems] = await Promise.all([
      getSharedOrder(publicId, (session?.user as Record<string, unknown>)?.id as string | undefined),
      getOrderHistory(publicId),
      getOverviewSessions((session?.user as Record<string, unknown>)?.id as string | undefined),
      getMarketItems(),
    ]);
  } catch (error) {
    if (error instanceof Error && (error.message === "ORDER_NOT_PUBLIC" || error.message === "ORDER_NOT_FOUND")) {
       if (!session) {
         redirect("/login");
       }
       redirect("/unauthorized");
    }
    throw error;
  }

  const isCreator = order.isAuthor === true;
  const isArchived = order.status === "archived";

  let accessLabel = "Read only";
  if (isCreator) {
    accessLabel = isArchived ? "Archived (View Only)" : "Author edit";
  } else if (canPrice) {
    accessLabel = "Cashier pricing";
  }

  return (
    <PantryLayout active="overview" showSidebar={showSidebar} sessions={sessions} marketItems={marketItems} userRole={(session?.user as Record<string, unknown>)?.role as string | undefined}>
      <div className="space-y-6">
        <div className="px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{order.title}</h1>
                {isArchived && <Badge variant="secondary" className="gap-1.5 h-6"><Archive className="h-3 w-3" /> Locked</Badge>}
              </div>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Created {order.createdAtLabel} 
                {isArchived && order.archivedAtLabel && ` • Archived ${order.archivedAtLabel}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isCreator && !isArchived && <ArchiveOrderDialog publicId={publicId} orderTitle={order.title} />}
              <Badge variant={isCreator ? "default" : "secondary"} className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">{accessLabel}</Badge>
              {session && <PublicShareToggle publicId={publicId} isPublic={order.isPublic} />}
              <ActivityLogMobileModal historyItems={historyItems} isCreator={isCreator} publicId={publicId} />
            </div>
          </div>
        </div>

        {order.receiptUrl && (
          <div className="px-4 sm:px-6">
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <ImageIcon className="h-3 w-3" /> Receipt Attachment
              </div>
              <div className="relative aspect-video max-w-sm overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-inner group">
                <Image 
                  src={order.receiptUrl} 
                  alt="Receipt" 
                  fill
                  unoptimized
                  className="object-cover transition-transform group-hover:scale-105" 
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                   <a 
                     href={order.receiptUrl} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="inline-flex items-center justify-center h-9 px-3 text-xs font-medium rounded-2xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                   >
                     View Full Image
                   </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            {/* Left Column: Main Order Content */}
            <div className="space-y-6">
            {/* ── Mobile Card Layout (< sm) ── */}
            <div className="sm:hidden space-y-3">
              {/* Item Composer - Only show to creator if not archived */}
              {isCreator && !isArchived && (
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md shadow-sm">
                  <table className="w-full"><tbody>
                    <OrderItemComposer publicId={publicId} marketItems={marketItems} />
                  </tbody></table>
                </div>
              )}

              {order.items.map((entry, index) => (
                <div
                  key={entry.id ?? `${entry.itemName}-${index}`}
                  className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card/40 backdrop-blur-md transition-colors hover:border-primary/30"
                >
                  {/* Item name row */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/20 px-4 py-3">
                    <span className={cn(
                      "text-[13px] font-semibold text-foreground/90 truncate",
                      isArchived && "text-muted-foreground/50 line-through"
                    )}>
                      {entry.itemName}
                    </span>
                    {isCreator && !isArchived && (
                      <DeleteItemButton publicId={publicId} itemIndex={index} itemName={entry.itemName} />
                    )}
                  </div>
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 divide-x divide-border/20">
                    <div className="flex flex-col items-center gap-0.5 py-2.5 px-2">
                      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">Qty</span>
                      <EditableQuantityCell
                        publicId={publicId}
                        itemIndex={index}
                        quantityLabel={entry.quantityLabel}
                        isCreator={isCreator && !isArchived}
                        variant="inline"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 py-2.5 px-2">
                      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">Price</span>
                      <span className="font-mono text-[12px] text-muted-foreground/70">
                        {entry.unitPrice === null ? <span className="opacity-30 italic text-[11px]">--</span> : `₱${entry.unitPrice}`}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 py-2.5 px-2">
                      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">Total</span>
                      <span className="font-mono text-[13px] font-bold text-foreground/90">₱{entry.lineTotal}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grand total card */}
              <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/[0.04] px-5 py-4 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80">Grand Total</span>
                <span className="text-xl font-black tracking-tight text-primary">₱{order.total}</span>
              </div>
            </div>

            {/* ── Desktop Table Layout (≥ sm) ── */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="pl-6 w-[45%] text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Item Name</TableHead>
                    <TableHead className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Qty</TableHead>
                    <TableHead className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Price</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 pr-6">Total</TableHead>
                    {isCreator && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Item Composer - Only show to creator if not archived */}
                  {isCreator && !isArchived && <OrderItemComposer publicId={publicId} marketItems={marketItems} />}
                  
                  {order.items.map((entry, index) => (
                    <TableRow key={entry.id ?? `${entry.itemName}-${index}`} className="group border-b border-border/10 transition-colors hover:bg-primary/5">
                      <TableCell className="py-3.5 pl-6 font-semibold text-[13px] text-foreground/90">
                        <span className={cn(isArchived ? "text-muted-foreground/50 line-through" : "")}>{entry.itemName}</span>
                      </TableCell>
                      <EditableQuantityCell 
                        publicId={publicId} 
                        itemIndex={index} 
                        quantityLabel={entry.quantityLabel} 
                        isCreator={isCreator && !isArchived} 
                      />
                      <TableCell className="py-3.5 text-center font-mono text-[11px] text-muted-foreground/60">
                        {entry.unitPrice === null ? <span className="opacity-20 italic">--</span> : `₱${entry.unitPrice}`}
                      </TableCell>
                      <TableCell className="py-3.5 text-right font-mono text-[12px] font-bold text-foreground/80 pr-6">
                        ₱{entry.lineTotal}
                      </TableCell>
                      {isCreator && (
                        <TableCell className="py-3.5 pr-2 text-right">
                          {!isArchived && <DeleteItemButton publicId={publicId} itemIndex={index} itemName={entry.itemName} />}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-border/40 bg-primary/[0.02] hover:bg-primary/[0.04]">
                    <TableCell colSpan={3} className="py-4 pl-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80">
                      Grand total
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <span className="text-lg font-black tracking-tight text-primary">₱{order.total}</span>
                    </TableCell>
                    {isCreator && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Right Column: Compact History */}
          <aside className="hidden lg:flex flex-col space-y-6 sticky top-8 h-[calc(100vh-8rem)] border-l border-border/30 pl-8">
            <div className="flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/80">Activity Log</h2>
                <Badge variant="outline" className="text-[9px] opacity-60">Realtime</Badge>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="relative space-y-8 pb-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border/50">
                  {historyItems.map((entry) => (
                    <div key={entry.id} className="relative pl-7 transition-all hover:translate-x-1">
                      <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-4 ring-primary/10 shadow-sm" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-foreground leading-none">{entry.action}</span>
                          <span className="text-[10px] font-medium text-muted-foreground/60 whitespace-nowrap">{entry.date}</span>
                        </div>
                        <div className="text-[12px] text-muted-foreground/80">
                          <span className="font-medium text-foreground/70">{entry.item}</span>
                          <span className="mx-1.5 opacity-30">•</span>
                          <span>{entry.quantity}</span>
                        </div>
                        {isCreator && entry.rawAction === "item_remove" && (
                          <UndoActionButton publicId={publicId} auditLogId={entry.id} />
                        )}
                      </div>
                    </div>
                  ))}
                  {historyItems.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-xs text-muted-foreground italic">No history yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
    </PantryLayout>
  );
}
