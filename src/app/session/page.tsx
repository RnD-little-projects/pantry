import { AppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { PublicShareToggle } from "../../components/public-share-toggle";
import { getMarketItems, getOrderHistory, getOverviewSessions, getSharedOrder } from "../../lib/pantry-db";

type SessionPageProps = {
  searchParams?: Promise<{
    publicId?: string | string[];
    role?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function SessionPage({ searchParams }: Readonly<SessionPageProps>) {
  const resolvedSearchParams = await searchParams;
  const publicId = getFirstParam(resolvedSearchParams?.publicId) || "demo-share-link";
  const role = getFirstParam(resolvedSearchParams?.role) || "viewer";
  const canEdit = role === "author";
  const canPrice = role === "cashier";
  const showSidebar = role !== "viewer";

  let order;
  let historyItems;
  let sessions;
  let marketItems;
  try {
    [order, historyItems, sessions, marketItems] = await Promise.all([
      getSharedOrder(publicId),
      getOrderHistory(publicId),
      getOverviewSessions(),
      getMarketItems(),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_PUBLIC") {
      return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>This page is not public shared.</CardTitle>
              <CardDescription>You need a public link or explicit access to view this order session.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link
                  href="/login"
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-transparent bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_-14px_rgba(45,212,191,0.75)] transition-all duration-200 hover:brightness-110"
                >
                  Go to login
                </Link>
            </CardContent>
          </Card>
        </main>
      );
    }

    throw error;
  }

  let accessLabel = "Read only";
  if (canEdit) {
    accessLabel = "Author edit";
  } else if (canPrice) {
    accessLabel = "Cashier pricing";
  }

  function renderAction() {
    if (canEdit) {
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
                <Badge variant={canEdit ? "default" : "secondary"}>{accessLabel}</Badge>
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
              <div className="mt-3">
                <PublicShareToggle publicId={publicId} isPublic={order.isPublic} />
              </div>
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
