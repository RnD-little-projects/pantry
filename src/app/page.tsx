import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLatestOrderPublicId, getOverviewSessions, getMarketItems, getMarketItemMetrics } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { startOrderAction } from "./new-order-action";
import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined;

  // If cashier or admin, show the dashboard
  if (userRole === "cashier" || userRole === "admin") {
    const [sessions, marketItems, metrics] = await Promise.all([
      getOverviewSessions((session?.user as Record<string, unknown>)?.id as string | undefined),
      getMarketItems(),
      getMarketItemMetrics(),
    ]);

    return (
      <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole={userRole} user={session.user as any}>
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
  
  // If user has an active order, redirect to it
  if (publicId) {
    redirect(`/order-list/${publicId}`);
  }

  const [sessions, marketItems] = await Promise.all([
    getOverviewSessions((session?.user as Record<string, unknown>)?.id as string | undefined),
    getMarketItems(),
  ]);

  return (
    <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole={(session.user as Record<string, unknown>).role as string | undefined} user={session.user as any}>
      <div className="space-y-6">
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Start a fresh order</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add your first item to begin a new private order list.</p>
        </div>

        <div className="max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md shadow-sm p-6">
          <form action={startOrderAction.bind(null, (session.user as Record<string, unknown>).id as string)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Name</label>
                <input
                  name="itemName"
                  placeholder="What do you need? (e.g. Milk, Apples)"
                  required
                  className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  placeholder="1"
                  min="1"
                  required
                  className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto font-semibold px-6 py-2.5 rounded-xl">
              Create Order List
            </Button>
          </form>
        </div>
      </div>
    </PantryLayout>
  );
}
