import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAllUsersWithOrderCounts, getOverviewSessions, getMarketItems } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";
import { UserOrderList } from "./UserOrderList";

export default async function AdminOrdersPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin" && role !== "cashier") {
    redirect("/unauthorized");
  }

  const [users, sessions, marketItems] = await Promise.all([
    getAllUsersWithOrderCounts(),
    getOverviewSessions((session.user as Record<string, unknown>).id as string | undefined),
    getMarketItems(),
  ]);

  return (
    <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole={(session.user as Record<string, unknown>).role as string | undefined}>
      <div className="space-y-6">
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin: User Orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage and view all orders organized by user.</p>
        </div>

        <div className="grid gap-6">
          <UserOrderList users={users} />
        </div>
      </div>
    </PantryLayout>
  );
}
