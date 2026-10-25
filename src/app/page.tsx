import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLatestOrderPublicId, getOverviewSessions, getMarketItems, getMarketItemMetrics } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <div className="mx-auto w-full max-w-xl space-y-6">
          <section aria-label="Counter report" className="receipt px-6 pb-6 pt-6 sm:px-8">
            <header className="pb-4 text-center">
              <h1 className="text-lg font-bold uppercase tracking-wide">Counter report</h1>
              <p className="mt-1 text-xs text-muted-foreground">Price the waiting items first, then check orders.</p>
            </header>
            <dl className="receipt-rule text-[15px]">
              <div className="flex items-center justify-between gap-4 border-b border-dotted border-border py-3">
                <dt className="font-semibold">Waiting for a price</dt>
                <dd>{metrics.pending > 0 ? <span className="stamp text-sm">{metrics.pending} to price</span> : "0"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-dotted border-border py-3">
                <dt>Priced</dt>
                <dd className="font-bold">{metrics.valuated}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt>All market items</dt>
                <dd className="font-bold">{metrics.total}</dd>
              </div>
            </dl>
            <div className="receipt-rule grid gap-3 pt-5 font-sans sm:grid-cols-2">
              <Link href="/admin/products" className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary/90">
                <Package aria-hidden="true" size={18} /> Set prices
              </Link>
              <Link href="/admin/orders" className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-current px-4 text-[15px] font-bold transition-colors hover:bg-foreground/5">
                <ShoppingCart aria-hidden="true" size={18} /> See orders
              </Link>
            </div>
          </section>
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
      <div className="mx-auto w-full max-w-xl pt-2 sm:pt-8">
        <form action={startOrderAction.bind(null, (session.user as Record<string, unknown>).id as string)} className="receipt px-6 pb-6 pt-6 sm:px-8">
          <header className="pb-4 text-center">
            <h1 className="text-lg font-bold uppercase tracking-wide">New list</h1>
            <p className="mt-1 text-xs text-muted-foreground">Write the first item and your list starts. Keep adding from there.</p>
          </header>
          <div className="receipt-rule grid grid-cols-[1fr_5rem] gap-3 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="start-item">Item</Label>
              <Input
                id="start-item"
                name="itemName"
                placeholder="milk, eggs, rice…"
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
              <Label htmlFor="start-qty">Qty</Label>
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
          <div className="receipt-rule mt-5 pt-5">
            <Button type="submit" size="lg" className="w-full">
              Start my list
            </Button>
          </div>
        </form>
      </div>
    </PantryLayout>
  );
}
