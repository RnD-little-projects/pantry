import { getUsers } from "./actions";
import UserManagementClient from "./user-management-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getOverviewSessions, getMarketItems } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";

export const metadata = {
  title: "User Management | Admin",
  description: "Manage users, roles, and security.",
};

export default async function UserManagementPage() {
  const session = await auth();
  
  if (session?.user?.role !== "admin") {
    redirect("/unauthorized");
  }

  const [users, sessions, marketItems] = await Promise.all([
    getUsers(),
    getOverviewSessions((session.user as Record<string, unknown>).id as string | undefined),
    getMarketItems(),
  ]);

  return (
    <PantryLayout active="users" sessions={sessions} marketItems={marketItems} userRole={(session.user as Record<string, unknown>).role as string | undefined}>
      <div className="space-y-6">
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin: User Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage users, roles, and security.</p>
        </div>
        <UserManagementClient initialUsers={users} />
      </div>
    </PantryLayout>
  );
}
