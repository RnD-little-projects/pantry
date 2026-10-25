import { auth } from "@/auth";
import { PantryLayout } from "@/components/pantry-layout";
import { Badge } from "@/components/ui/badge";
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
import { Image as ImageIcon } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";

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
    accessLabel = isArchived ? "View only" : "You can edit";
  } else if (canPrice) {
    accessLabel = "Cashier pricing";
  }

  const canEdit = isCreator && !isArchived;
  const pendingCount = order.items.filter((entry) => entry.unitPrice === null).length;

  return (
    <PantryLayout active="overview" showSidebar={showSidebar} sessions={sessions} marketItems={marketItems} userRole={(session?.user as Record<string, unknown>)?.role as string | undefined} user={session?.user as any}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-start">
        {/* The whole order is one receipt */}
        <section aria-label="Order" className="receipt min-w-0 px-5 pb-6 pt-6 sm:px-7">
          <header className="flex flex-col items-center gap-1.5 pb-4 text-center">
            <h1 className="break-words text-lg font-bold uppercase tracking-wide">{order.title}</h1>
            <p className="text-xs text-muted-foreground">
              Created {order.createdAtLabel}, {order.items.length} {order.items.length === 1 ? "item" : "items"}
              {isArchived && order.archivedAtLabel && `, paid ${order.archivedAtLabel}`}
            </p>
            {(isArchived || order.paymentMethod === "cash") && (
              <div className="mt-1 flex gap-2">
                {isArchived && <span className="stamp">Paid &amp; locked</span>}
                {order.paymentMethod === "cash" && <span className="stamp text-success">Cash</span>}
              </div>
            )}
          </header>

          {canEdit && (
            // No overflow-hidden here: it would clip the suggestion dropdown.
            <div className="receipt-rule relative z-10 py-4">
              <table className="w-full"><tbody>
                <OrderItemComposer publicId={publicId} marketItems={marketItems} />
              </tbody></table>
            </div>
          )}

          {order.items.length === 0 ? (
            <p className="receipt-rule py-10 text-center text-sm text-muted-foreground">
              {canEdit ? "Nothing on the list yet. Add your first item above." : "No items on this list yet."}
            </p>
          ) : (
            <ul className="receipt-rule">
              {order.items.map((entry, index) => (
                <li key={entry.id ?? `${entry.itemName}-${index}`} className="group border-b border-dotted border-border py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3 text-[15px] font-semibold">
                    <span className={cn("min-w-0 break-words", isArchived && "text-muted-foreground")}>{entry.itemName}</span>
                    {entry.unitPrice === null ? (
                      <span className="stamp mt-0.5">No price</span>
                    ) : (
                      <span className="shrink-0">{formatMoney(entry.lineTotal)}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
                    <span>
                      {/* When editable, the stepper shows the quantity, so the line only needs the unit price */}
                      {canEdit
                        ? (entry.unitPrice === null ? "---- each" : `${formatMoney(entry.unitPrice)} each`)
                        : `${entry.quantityLabel} @ ${entry.unitPrice === null ? "----" : formatMoney(entry.unitPrice)}`}
                    </span>
                    {canEdit && (
                      <span className="flex items-center gap-1">
                        <EditableQuantityCell publicId={publicId} itemIndex={index} quantityLabel={entry.quantityLabel} isCreator={canEdit} variant="inline" />
                        <DeleteItemButton publicId={publicId} itemIndex={index} itemName={entry.itemName} />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="receipt-rule mt-1 pt-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[15px] font-bold uppercase">Total</span>
              <span className="text-3xl font-bold" aria-live="polite">₱{formatMoney(order.total)}</span>
            </div>
            {pendingCount > 0 && (
              <p className="mt-1 text-right text-xs text-highlight">
                {pendingCount} {pendingCount === 1 ? "item still needs" : "items still need"} a price from the cashier
              </p>
            )}
            {canEdit && (
              <div className="mt-5">
                <ArchiveOrderDialog publicId={publicId} orderTitle={order.title} />
              </div>
            )}
          </div>

          {order.receiptUrl && (
            <div className="receipt-rule mt-5 flex items-center gap-4 pt-4">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden bg-muted">
                <Image src={order.receiptUrl} alt="Receipt photo" fill unoptimized className="object-cover" />
              </div>
              <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
                <ImageIcon aria-hidden="true" className="h-4 w-4" /> View receipt photo
              </a>
            </div>
          )}
        </section>

        {/* Beside the receipt, on the counter: sharing and activity */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-8">
          <div className="space-y-3">
            <h2 className="font-display text-lg">Sharing</h2>
            <div className="flex flex-wrap items-center gap-2">
              {session && <PublicShareToggle publicId={publicId} isPublic={order.isPublic} />}
              <Badge variant={isCreator ? "default" : "outline"}>{accessLabel}</Badge>
              <ActivityLogMobileModal historyItems={historyItems} isCreator={isCreator} isAdmin={session?.user?.role === "admin"} publicId={publicId} />
            </div>
          </div>

          {/* Activity log (desktop; phones use ActivityLogMobileModal) */}
          <div className="hidden lg:block">
            <h2 className="font-display text-lg">Activity</h2>
            <ol className="mt-3 max-h-[calc(100dvh-14rem)] space-y-3 overflow-y-auto pr-2 font-mono text-[13px] custom-scrollbar">
              {historyItems.map((entry) => (
                <li key={entry.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3">
                  <span className="text-muted-foreground">{entry.date}</span>
                  <span className="min-w-0">
                    <span className="font-semibold">{entry.action}</span> {entry.item}, {entry.quantity}
                    {(entry.isAdminRemove ? session?.user?.role === "admin" : isCreator) && entry.rawAction === "item_remove" && (
                      <span className="block"><UndoActionButton publicId={publicId} auditLogId={entry.id} /></span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            {historyItems.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Changes to this list show up here.</p>
            )}
          </div>
        </aside>
      </div>
    </PantryLayout>
  );
}
