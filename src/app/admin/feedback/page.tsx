import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { PantryLayout } from "@/components/pantry-layout";
import { connectMongo } from "@/lib/db/mongodb";
import { getMarketItems, getOverviewSessions } from "@/lib/pantry-db";
import { Feedback } from "@/models";
import { FeedbackClient, type FeedbackItem } from "./FeedbackClient";

export const metadata = { title: "Feedback | Admin" };

export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // Admin only, checked here and again in every action
  if (session.user?.role !== "admin") redirect("/unauthorized");

  await connectMongo();
  const [sessions, marketItems, rows] = await Promise.all([
    getOverviewSessions(session.user?.id),
    getMarketItems(),
    // shortcut: only the latest 300 entries are shown; add paging if feedback grows past that
    Feedback.find({}).sort({ createdAt: -1 }).limit(300).populate("userId", "username").lean(),
  ]);

  const items: FeedbackItem[] = (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r._id),
    username: (r.userId as { username?: string } | null)?.username ?? "unknown",
    category: r.category as FeedbackItem["category"],
    rating: (r.rating as number | null) ?? null,
    message: String(r.message),
    page: String(r.page ?? ""),
    status: r.status as FeedbackItem["status"],
    createdAt: (r.createdAt as Date).toISOString(),
  }));

  return (
    <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole="admin" user={session.user as never}>
      <FeedbackClient items={items} />
    </PantryLayout>
  );
}
