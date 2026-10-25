import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLatestOrderPublicId, getOverviewSessions, getMarketItems, getMarketItemMetrics } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">Today at the counter</h1>
            <p className="mt-1 text-sm text-muted-foreground">Price waiting items first, then check orders.</p>
          </div>

          {/* Waiting-for-price gets the sticker: it's the cashier's to-do */}
          <section aria-label="Market items" className="rounded-sheet border border-border bg-card">
            <Link href="/admin/products" className="flex items-center justify-between gap-4 rounded-t-sheet p-5 transition-colors hover:bg-muted/50">
              <div>
                <p className="font-semibold">Waiting for a price</p>
                <p className="text-sm text-muted-foreground">Set prices in Products</p>
              </div>
              <span className={metrics.pending > 0 ? "sticker text-2xl" : "sticker sticker-empty text-2xl"}>{metrics.pending}</span>
            </Link>
            <dl className="grid grid-cols-2 divide-x divide-border border-t border-border">
              <div className="p-5">
                <dt className="text-sm text-muted-foreground">Priced</dt>
                <dd className="font-display mt-1 text-2xl text-success">{metrics.valuated}</dd>
              </div>
              <div className="p-5">
                <dt className="text-sm text-muted-foreground">All market items</dt>
                <dd className="font-display mt-1 text-2xl">{metrics.total}</dd>
              </div>
            </dl>
          </section>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Link href="/admin/products" className="group flex items-center gap-4 rounded-sheet border border-border bg-card p-5 transition-colors hover:border-primary">
              <span className="rounded-control bg-accent p-3 text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Package aria-hidden="true" size={22} />
              </span>
              <span>
                <span className="block font-semibold">Products</span>
                <span className="block text-sm text-muted-foreground">Add items and set prices</span>
              </span>
            </Link>

            <Link href="/admin/orders" className="group flex items-center gap-4 rounded-sheet border border-border bg-card p-5 transition-colors hover:border-primary">
              <span className="rounded-control bg-accent p-3 text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <ShoppingCart aria-hidden="true" size={22} />
              </span>
              <span>
                <span className="block font-semibold">Orders</span>
                <span className="block text-sm text-muted-foreground">See every customer’s list</span>
              </span>
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
      <div className="mx-auto w-full max-w-xl space-y-6 pt-2 sm:pt-10">
        <div>
          <h1 className="font-display text-3xl text-balance sm:text-4xl">What do you need today?</h1>
          <p className="mt-2 text-muted-foreground">Add the first item and your list starts. Keep adding from there.</p>
        </div>

        <form action={startOrderAction.bind(null, (session.user as Record<string, unknown>).id as string)} className="space-y-4 rounded-sheet border border-border bg-card p-5">
          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-item">Item</Label>
              <Input
                id="start-item"
                name="itemName"
                placeholder="Milk, eggs, rice…"
                list="market-item-names"
                autoComplete="off"
                required
              />
              <datalist id="market-item-names">
                {marketItems.map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-qty">Quantity</Label>
              <Input
                id="start-qty"
                name="quantity"
                type="number"
                inputMode="numeric"
                defaultValue="1"
                min="1"
                required
                className="no-spinner text-center"
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full">
            Start my list
          </Button>
        </form>
      </div>
    </PantryLayout>
  );
}
