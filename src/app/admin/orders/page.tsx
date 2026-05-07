import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAllUsersWithOrderCounts, getOverviewSessions, getMarketItems } from "@/lib/pantry-db";
import { AppShell } from "@/components/app-shell";
import { UserOrderList } from "./UserOrderList";

export default async function AdminOrdersPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if ((session.user as any).role !== "admin") {
    redirect("/unauthorized");
  }

  const [users, sessions, marketItems] = await Promise.all([
    getAllUsersWithOrderCounts(),
    getOverviewSessions(),
    getMarketItems(),
  ]);

  return (
    <AppShell active="overview" sessions={sessions} marketItems={marketItems} userRole={(session.user as any).role}>
      <div className="space-y-6">
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin: User Orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage and view all orders organized by user.</p>
        </div>

        <div className="grid gap-6">
          <UserOrderList users={users} />
        </div>
      </div>
    </AppShell>
  );
}
