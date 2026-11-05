import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { PantryLayout } from "@/components/pantry-layout";
import { connectMongo } from "@/lib/db/mongodb";
import { getMarketItems, getOverviewSessions } from "@/lib/pantry-db";
import { ItemRequest } from "@/models";
import { RequestsClient, type StaffRequest } from "./RequestsClient";

export const metadata = { title: "Item requests | Admin" };

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user?.role;
  if (role !== "admin" && role !== "cashier") redirect("/unauthorized");

  await connectMongo();
  const [sessions, marketItems, rows] = await Promise.all([
    getOverviewSessions(session.user?.id),
    getMarketItems(),
    // shortcut: only the latest 500 requests are shown; add paging if the list ever gets that long
    ItemRequest.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("requesterId", "username")
      .populate("likes", "username")
      .lean(),
  ]);

  const requests: StaffRequest[] = (rows as Record<string, unknown>[]).map((r) => {
    const requester = (r.requesterId as { username?: string } | null)?.username ?? "unknown";
    const likers = ((r.likes as { username?: string }[] | undefined) ?? []).map((u) => u?.username ?? "unknown");
    return {
      id: String(r._id),
      name: String(r.name),
      status: r.status as StaffRequest["status"],
      note: String(r.note ?? ""),
      staffNote: String(r.staffNote ?? ""),
      requesters: [requester, ...likers],
      createdAt: (r.createdAt as Date).toISOString(),
    };
  });
  // Most wanted first, so staff check the popular ones on the next store run
  requests.sort((a, b) => b.requesters.length - a.requesters.length || b.createdAt.localeCompare(a.createdAt));

  return (
    <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole={role} user={session.user as never}>
      <RequestsClient requests={requests} />
    </PantryLayout>
  );
}
