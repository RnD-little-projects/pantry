import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLatestOrderPublicId, getOverviewSessions, getMarketItems, getMarketItemMetrics } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { startOrderAction } from "./new-order-action";
import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";

type HomeProps = {
  searchParams?: Promise<{
    new?: string;
  }>;
};

export default async function Home({ searchParams }: Readonly<HomeProps>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const isExplicitNew = resolvedSearchParams?.new === "true";

  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined;

  // If cashier or admin, show the dashboard
  if (userRole === "cashier" || userRole === "admin") {
    const [sessions, marketItems, metrics] = await Promise.all([
      getOverviewSessions((session?.user as Record<string, unknown>)?.id as string | undefined),
      getMarketItems(),
      getMarketItemMetrics(),
    ]);

    return (
      <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole={userRole}>
        <div className="space-y-6">
          <div className="px-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cashier Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Overview of market items and quick navigation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Total Market Items</p>
              <h2 className="mt-2 text-3xl font-bold">{metrics.total}</h2>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
              <p className="text-sm font-medium text-amber-600/80 dark:text-amber-400/80">Pending Valuation</p>
              <h2 className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{metrics.pending}</h2>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
              <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80">Valuated Items</p>
              <h2 className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.valuated}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Link href="/admin/products" className="group rounded-xl border border-border/60 bg-card p-6 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Manage Products</h3>
                  <p className="text-sm text-muted-foreground">Add, edit, or set prices for market items</p>
                </div>
              </div>
            </Link>
            
            <Link href="/admin/orders" className="group rounded-xl border border-border/60 bg-card p-6 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Manage Orders</h3>
                  <p className="text-sm text-muted-foreground">View and manage all user orders</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </PantryLayout>
    );
  }

  const publicId = await getLatestOrderPublicId((session?.user as Record<string, unknown>)?.id as string | undefined);
  
  // If user has orders and didn't explicitly click "New Session", redirect to latest
  if (publicId && !isExplicitNew) {
    redirect(`/order-list/${publicId}`);
  }

  const [sessions, marketItems] = await Promise.all([
    getOverviewSessions((session?.user as Record<string, unknown>)?.id as string | undefined),
    getMarketItems(),
  ]);

  return (
    <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole={(session.user as Record<string, unknown>).role as string | undefined}>
      <div className="space-y-6">
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Start a fresh order</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add your first item to begin a new private order list.</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-background/80 shadow-sm w-full overflow-x-auto">
          <form action={startOrderAction.bind(null, (session.user as Record<string, unknown>).id as string)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <input
                      name="itemName"
                      placeholder="What do you need?"
                      required
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      name="quantity"
                      type="number"
                      placeholder="0"
                      required
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="submit" size="sm">
                      Create Order
                    </Button>
                  </TableCell>
                </TableRow>
                {/* Empty state placeholder rows */}
                {[1, 2, 3].map((i) => (
                  <TableRow key={i} className="opacity-20 select-none pointer-events-none">
                    <TableCell className="h-12"></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </form>
        </div>
      </div>
    </PantryLayout>
  );
}
