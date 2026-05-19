import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPaginatedAuditLogs, getAuditLogUsers, getOverviewSessions, getMarketItems } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";
import { AuditLogsClient } from "./audit-logs-client";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined;
  if (userRole !== "admin") {
    redirect("/unauthorized");
  }

  const [sessions, marketItems, { logs, hasMore }, auditUsers] = await Promise.all([
    getOverviewSessions((session?.user as Record<string, unknown>)?.id as string | undefined),
    getMarketItems(),
    getPaginatedAuditLogs(1, 20),
    getAuditLogUsers(),
  ]);

  return (
    <PantryLayout active="users" sessions={sessions} marketItems={marketItems} userRole={userRole} user={session.user as any}>
      <AuditLogsClient initialLogs={logs} initialHasMore={hasMore} auditUsers={auditUsers} />
    </PantryLayout>
  );
}
