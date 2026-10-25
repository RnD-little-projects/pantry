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
    accessLabel = isArchived ? "Archived (view only)" : "You can edit";
  } else if (canPrice) {
    accessLabel = "Cashier pricing";
  }

  const canEdit = isCreator && !isArchived;
  const pendingCount = order.items.filter((entry) => entry.unitPrice === null).length;

  return (
    <PantryLayout active="overview" showSidebar={showSidebar} sessions={sessions} marketItems={marketItems} userRole={(session?.user as Record<string, unknown>)?.role as string | undefined} user={session?.user as any}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-5">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display min-w-0 break-words text-2xl text-balance sm:text-3xl">{order.title}</h1>
              {isArchived && <Badge variant="secondary"><Archive aria-hidden="true" className="h-3 w-3" /> Locked</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {order.items.length} {order.items.length === 1 ? "item" : "items"}
              {pendingCount > 0 && `, ${pendingCount} waiting for a price`}
              <span className="block text-xs">
                Created {order.createdAtLabel}
                {isArchived && order.archivedAtLabel && `, archived ${order.archivedAtLabel}`}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isCreator ? "default" : "secondary"}>{accessLabel}</Badge>
              {order.paymentMethod === "cash" && <Badge variant="success">Paid in cash</Badge>}
              {session && <PublicShareToggle publicId={publicId} isPublic={order.isPublic} />}
              <ActivityLogMobileModal historyItems={historyItems} isCreator={isCreator} isAdmin={session?.user?.role === "admin"} publicId={publicId} />
              {canEdit && <div className="ml-auto"><ArchiveOrderDialog publicId={publicId} orderTitle={order.title} /></div>}
            </div>
          </header>

          {order.receiptUrl && (
            <section aria-label="Receipt" className="flex items-center gap-4 rounded-sheet border border-border bg-card p-3">
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-control bg-muted">
                <Image src={order.receiptUrl} alt="Receipt photo" fill unoptimized className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold"><ImageIcon aria-hidden="true" className="h-4 w-4 text-primary" /> Receipt</p>
                <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-primary underline underline-offset-4">
                  View full image
                </a>
              </div>
            </section>
          )}

          {/* The crate: one sheet holding the composer and the items */}
          <section aria-label="Items" className="rounded-sheet border border-border bg-card">
            {canEdit && (
              // No overflow-hidden here: it would clip the suggestion dropdown.
              <div className="relative z-10 border-b border-border p-3 sm:p-4">
                <table className="w-full"><tbody>
                  <OrderItemComposer publicId={publicId} marketItems={marketItems} />
                </tbody></table>
              </div>
            )}

            {order.items.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                {canEdit ? "Your list is empty. Add your first item above." : "No items on this list yet."}
              </p>
            ) : (
              <>
                {/* Phones: stacked rows */}
                <ul className="divide-y divide-border sm:hidden">
                  {order.items.map((entry, index) => (
                    <li key={entry.id ?? `${entry.itemName}-${index}`} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={cn("break-words font-semibold", isArchived && "text-muted-foreground line-through")}>{entry.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.unitPrice === null ? "Waiting for price" : `₱${entry.unitPrice} each`}
                          </p>
                        </div>
                        <span className={cn("sticker mt-0.5 text-sm", entry.unitPrice === null && "sticker-empty")}>
                          {entry.unitPrice === null ? <span aria-label="No price yet">—</span> : `₱${entry.lineTotal}`}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <EditableQuantityCell publicId={publicId} itemIndex={index} quantityLabel={entry.quantityLabel} isCreator={canEdit} variant="inline" />
                        {canEdit && <DeleteItemButton publicId={publicId} itemIndex={index} itemName={entry.itemName} />}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Tablet and up: table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6">Item</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Each</TableHead>
                        <TableHead className="pr-6 text-right">Total</TableHead>
                        {isCreator && <TableHead className="w-12"><span className="sr-only">Remove</span></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((entry, index) => (
                        <TableRow key={entry.id ?? `${entry.itemName}-${index}`} className="group">
                          <TableCell className="pl-6 font-semibold">
                            <span className={cn(isArchived && "text-muted-foreground line-through")}>{entry.itemName}</span>
                          </TableCell>
                          <EditableQuantityCell publicId={publicId} itemIndex={index} quantityLabel={entry.quantityLabel} isCreator={canEdit} />
                          <TableCell className="text-right text-muted-foreground">
                            {entry.unitPrice === null ? "—" : `₱${entry.unitPrice}`}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <span className={cn("sticker text-sm", entry.unitPrice === null && "sticker-empty")}>
                              {entry.unitPrice === null ? <span aria-label="No price yet">—</span> : `₱${entry.lineTotal}`}
                            </span>
                          </TableCell>
                          {isCreator && (
                            <TableCell className="pr-3 text-right">
                              {!isArchived && <DeleteItemButton publicId={publicId} itemIndex={index} itemName={entry.itemName} />}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </section>

          {/* Sticky total bar, always within thumb reach */}
          <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-4 rounded-sheet bg-highlight px-5 py-3.5 text-highlight-foreground">
            <span className="font-semibold">
              Total
              {pendingCount > 0 && <span className="block text-xs font-medium opacity-80">{pendingCount} still unpriced</span>}
            </span>
            <span className="font-display text-2xl sm:text-3xl" aria-live="polite">₱{order.total}</span>
          </div>
        </div>

        {/* Activity log (desktop; phones use ActivityLogMobileModal) */}
        <aside className="sticky top-8 hidden h-[calc(100dvh-4rem)] flex-col lg:flex">
          <h2 className="font-display shrink-0 text-lg">Activity</h2>
          <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <ol className="relative space-y-6 pb-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border">
              {historyItems.map((entry) => (
                <li key={entry.id} className="relative pl-6">
                  <span aria-hidden="true" className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-background bg-primary" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{entry.action}</span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground">{entry.item}</span>, {entry.quantity}
                  </p>
                  {(entry.isAdminRemove ? session?.user?.role === "admin" : isCreator) && entry.rawAction === "item_remove" && (
                    <UndoActionButton publicId={publicId} auditLogId={entry.id} />
                  )}
                </li>
              ))}
            </ol>
            {historyItems.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Changes to this list show up here.</p>
            )}
          </div>
        </aside>
      </div>
    </PantryLayout>
  );
}
