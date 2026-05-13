import { auth } from "@/auth";
import { PantryLayout } from "@/components/pantry-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PublicShareToggle } from "@/components/public-share-toggle";
import { getMarketItems, getOrderHistory, getOverviewSessions, getSharedOrder } from "@/lib/pantry-db";
import { redirect } from "next/navigation";
import { OrderItemComposer } from "./order-item-composer";
import { EditableQuantityCell } from "./editable-quantity-cell";
import { DeleteItemButton } from "./delete-item-button";
import { UndoActionButton } from "./undo-action-button";
import { ArchiveOrderDialog } from "./archive-order-dialog";
import { Camera, Image as ImageIcon, Archive } from "lucide-react";
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
      getSharedOrder(publicId, (session?.user as any)?.id),
      getOrderHistory(publicId),
      getOverviewSessions(),
      getMarketItems(),
    ]);
  } catch (error) {
    if (error instanceof Error && (error.message === "ORDER_NOT_PUBLIC" || error.message === "ORDER_NOT_FOUND")) {
       // If not logged in and order not public or not found, go to login
       if (!session) {
         redirect("/login");
       }
       
       // If logged in but order not public or not found, show unauthorized
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
    <PantryLayout active="overview" showSidebar={showSidebar} sessions={sessions} marketItems={marketItems} userRole={(session?.user as any)?.role}>
      <div className="space-y-6">
      <div className="px-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{order.title}</h1>
              {isArchived && <Badge variant="secondary" className="gap-1.5 h-6"><Archive className="h-3 w-3" /> Locked</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {order.createdAtLabel} 
              {isArchived && order.archivedAtLabel && ` • Archived ${order.archivedAtLabel}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCreator && !isArchived && <ArchiveOrderDialog publicId={publicId} orderTitle={order.title} />}
            {session && <PublicShareToggle publicId={publicId} isPublic={order.isPublic} />}
            <Badge variant={isCreator ? "default" : "secondary"}>{accessLabel}</Badge>
            <Badge variant={order.isPublic ? "default" : "outline"}>{order.isPublic ? "Public" : "Private"}</Badge>
          </div>
        </div>
      </div>

      {order.receiptUrl && (
        <div className="mx-1 overflow-hidden rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <ImageIcon className="h-3 w-3" /> Receipt Attachment
          </div>
          <div className="relative aspect-video max-w-sm overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-inner group">
            <img 
              src={order.receiptUrl} 
              alt="Receipt" 
              className="h-full w-full object-cover transition-transform group-hover:scale-105" 
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
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main Column: Order Items */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 w-full min-w-[200px] px-4 text-[10px] uppercase tracking-widest text-muted-foreground/70">Item</TableHead>
                  <TableHead className="h-12 w-[90px] px-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground/70">Qty</TableHead>
                  <TableHead className="h-12 w-[110px] px-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">Price</TableHead>
                  <TableHead className="h-12 w-[100px] px-4 text-right text-[10px] uppercase tracking-widest text-muted-foreground/70">Total</TableHead>
                  {isCreator && <TableHead className="h-12 w-[50px] px-0" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCreator && !isArchived && <OrderItemComposer publicId={publicId} marketItems={marketItems} />}
                {order.items.map((entry, index) => (
                  <TableRow key={entry.id ?? `${entry.itemName}-${index}`} className="group border-border/40 hover:bg-muted/30">
                    <TableCell className="py-4">
                      <div className={cn("font-medium", isArchived ? "text-muted-foreground" : "text-foreground")}>
                        {entry.itemName}
                      </div>
                    </TableCell>
                    <EditableQuantityCell 
                      publicId={publicId} 
                      itemIndex={index} 
                      quantityLabel={entry.quantityLabel} 
                      isCreator={isCreator && !isArchived} 
                    />
                    <TableCell className="py-4 font-mono text-[13px] text-muted-foreground">
                      {entry.unitPrice === null ? <span className="italic opacity-50">Pending</span> : `₱${entry.unitPrice}`}
                    </TableCell>
                    <TableCell className="py-4 text-right font-mono text-[13px] text-muted-foreground">
                      ₱{entry.lineTotal}
                    </TableCell>
                    {isCreator && (
                      <TableCell className="py-4 px-0 text-center">
                        {!isArchived && <DeleteItemButton publicId={publicId} itemIndex={index} itemName={entry.itemName} />}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-border/60 bg-muted/20">
                  <TableCell colSpan={3} className="py-5 font-bold text-foreground">
                    Grand total
                  </TableCell>
                  <TableCell className="py-5 text-right font-mono text-lg font-bold text-primary">
                    ₱{order.total}
                  </TableCell>
                  {isCreator && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Column: Compact History */}
        <aside className="space-y-6 lg:sticky lg:top-8 lg:h-[calc(100vh-8rem)] lg:border-l lg:border-border/30 lg:pl-8">
          <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/80">Activity Log</h2>
              <Badge variant="outline" className="text-[9px] opacity-60">Realtime</Badge>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="relative space-y-8 pb-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border/50">
                {historyItems.map((entry) => (
                  <div key={entry.id} className="relative pl-7 transition-all hover:translate-x-1">
                    {/* Timeline Dot */}
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
    </PantryLayout>
  );
}
