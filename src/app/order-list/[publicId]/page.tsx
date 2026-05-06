import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PublicShareToggle } from "@/components/public-share-toggle";
import { getMarketItems, getOrderHistory, getOverviewSessions, getSharedOrder } from "@/lib/pantry-db";
import { redirect } from "next/navigation";
import { OrderItemComposer } from "./order-item-composer";

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
  let accessLabel = "Read only";
  if (isCreator) {
    accessLabel = "Author edit";
  } else if (canPrice) {
    accessLabel = "Cashier pricing";
  }

  function renderAction() {
    if (isCreator) {
      return <Button variant="outline" size="sm">Edit</Button>;
    }

    if (canPrice) {
      return <Button variant="outline" size="sm">Finalize</Button>;
    }

    return <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Read only</span>;
  }

  return (
    <AppShell active="overview" showSidebar={showSidebar} sessions={sessions} marketItems={marketItems}>
      <div className="space-y-8 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <Card className="border-border/60 bg-background/80">
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>{order.title}</CardTitle>
                <CardDescription>Shareable order: {publicId}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isCreator ? "default" : "secondary"}>{accessLabel}</Badge>
                <Badge variant={order.isPublic ? "default" : "outline"}>{order.isPublic ? "Public" : "Private"}</Badge>
                <Badge variant="outline">{order.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Created</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{order.createdAtLabel}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Updated</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{order.updatedAtLabel}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Access</div>
              <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-foreground">
                <span aria-hidden="true">{order.isPublic ? "🌐" : "🔒"}</span>
                <span>{order.isPublic ? "Public link" : "Private link"}</span>
              </div>
              {session && (
                <div className="mt-3">
                  <PublicShareToggle publicId={publicId} isPublic={order.isPublic} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price per item</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((entry) => (
                <TableRow key={entry.id ?? entry.itemName}>
                  <TableCell>
                    <div className="font-medium text-foreground">{entry.itemName}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.quantityLabel}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{entry.unitPrice === null ? "Pending" : `₱${entry.unitPrice}`}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">₱{entry.lineTotal}</TableCell>
                  <TableCell className="text-right">
                    {renderAction()}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="font-semibold text-foreground">
                  Grand total
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">₱{order.total}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {isCreator && <OrderItemComposer publicId={publicId} />}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm">
          <div className="border-b border-border/60 px-6 py-4 bg-slate-950/5 text-sm font-semibold text-foreground">History</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyItems.map((entry) => (
                <TableRow key={`${entry.date}-${entry.item}`}>
                  <TableCell className="text-muted-foreground">{entry.date}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{entry.item}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.quantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{entry.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
