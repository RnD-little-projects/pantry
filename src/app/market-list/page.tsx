import { auth } from "@/auth";
import { PantryLayout } from "../../components/pantry-layout";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { getMarketItems, getOverviewSessions } from "../../lib/pantry-db";
import { redirect } from "next/navigation";

export default async function MarketListPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const [marketItems, sessions] = await Promise.all([
    getMarketItems(), 
    getOverviewSessions((session.user as Record<string, unknown>).id as string | undefined)
  ]);

  return (
    <PantryLayout active="market" marketItems={marketItems} sessions={sessions} userRole={(session.user as Record<string, unknown>).role as string | undefined} user={session.user as any}>
      <section aria-label="Market prices" className="receipt mx-auto w-full max-w-2xl px-5 pb-6 pt-6 sm:px-8">
        <header className="pb-4 text-center">
          <h1 className="text-lg font-bold uppercase tracking-wide">Price list</h1>
          <p className="mt-1 text-xs text-muted-foreground">What each item costs today, {marketItems.length} items</p>
        </header>
        <ul className="receipt-rule">
          {marketItems.map((item) => (
            <li key={item.id ?? item.name} className="border-b border-dotted border-border py-3 last:border-b-0">
              <div className="flex items-baseline gap-2 text-[15px]">
                <span className="font-semibold">{item.name}</span>
                <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-4px] border-b border-dotted border-input" />
                {item.price === "Pending" ? <span className="stamp">No price</span> : <span className="font-bold">{item.price}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Badge variant={item.status === "Active" ? "success" : "outline"}>{item.status}</Badge>
                  {item.note}
                </span>
                <Button variant="outline" size="sm">
                  Archive
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </PantryLayout>
  );
}
