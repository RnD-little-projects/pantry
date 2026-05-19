"use server";

import { getPaginatedAuditLogs } from "@/lib/pantry-db";
import { auth } from "@/auth";

export async function fetchMoreAuditLogsAction(
  page: number, 
  limit: number, 
  searchQuery: string, 
  selectedUsers: string[], 
  selectedActions: string[]
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return getPaginatedAuditLogs(page, limit, searchQuery, selectedUsers, selectedActions);
}
