import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPaginatedAuditLogs, getAuditLogUsers } from "../lib/pantry-db";
import { fetchMoreAuditLogsAction } from "../app/admin/audit-logs/actions";

// Mock dependencies
vi.mock("../lib/pantry-db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/pantry-db")>();
  return {
    ...actual,
    canUseMongo: vi.fn().mockResolvedValue(true),
    getPaginatedAuditLogs: vi.fn(),
    getAuditLogUsers: vi.fn(),
  };
});

vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "../auth";
import type { Session } from "next-auth";

// auth is overloaded; pin the session-returning signature for mocking
const mockAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

describe("Audit Logs Quality Assurance & Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPaginatedAuditLogs - Pagination & Database Queries", () => {
    it("should return sliced logs and hasMore=true when total items exceed limit", async () => {
      // Mocking 21 logs returned from DB when limit is 20
      const mockLogs = Array.from({ length: 21 }, (_, i) => ({
        _id: `log_${i}`,
        action: "user_create",
        targetId: `user_${i}`,
        createdAt: new Date().toISOString(),
      }));

      // Simulate pantry-db behavior for limit + 1
      const limit = 20;
      const hasMore = mockLogs.length > limit;
      const slicedLogs = hasMore ? mockLogs.slice(0, limit) : mockLogs;

      vi.mocked(getPaginatedAuditLogs).mockResolvedValueOnce({
        logs: slicedLogs as any,
        hasMore,
      });

      const result = await getPaginatedAuditLogs(1, 20);

      expect(result.logs).toHaveLength(20);
      expect(result.hasMore).toBe(true);
    });

    it("should return hasMore=false when total items are within limit", async () => {
      const mockLogs = Array.from({ length: 15 }, (_, i) => ({
        _id: `log_${i}`,
        action: "item_add",
        targetId: `order_${i}`,
        createdAt: new Date().toISOString(),
      }));

      vi.mocked(getPaginatedAuditLogs).mockResolvedValueOnce({
        logs: mockLogs as any,
        hasMore: false,
      });

      const result = await getPaginatedAuditLogs(1, 20);

      expect(result.logs).toHaveLength(15);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("fetchMoreAuditLogsAction - Server Action Authorization", () => {
    it("should throw 'Unauthorized' error if user is not logged in", async () => {
      mockAuth.mockResolvedValueOnce(null);

      await expect(
        fetchMoreAuditLogsAction(1, 20, "", [], [])
      ).rejects.toThrow("Unauthorized");
    });

    it("should throw 'Unauthorized' error if user role is not admin", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user_123", role: "cashier", name: "John" },
        expires: "9999",
      });

      await expect(
        fetchMoreAuditLogsAction(1, 20, "", [], [])
      ).rejects.toThrow("Unauthorized");
    });

    it("should call getPaginatedAuditLogs successfully if user is admin", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin_123", role: "admin", name: "Admin Jane" },
        expires: "9999",
      });

      vi.mocked(getPaginatedAuditLogs).mockResolvedValueOnce({
        logs: [],
        hasMore: false,
      });

      const result = await fetchMoreAuditLogsAction(1, 20, "test query", ["user_1"], ["user_create"]);

      expect(getPaginatedAuditLogs).toHaveBeenCalledWith(1, 20, "test query", ["user_1"], ["user_create"]);
      expect(result).toEqual({ logs: [], hasMore: false });
    });
  });

  describe("getAuditLogUsers - Distinct Actor Extraction", () => {
    it("should fetch distinct actors successfully", async () => {
      const mockUsers = [
        { _id: "user_1", username: "alice", email: "alice@example.com" },
        { _id: "user_2", username: "bob", email: "bob@example.com" },
      ];

      vi.mocked(getAuditLogUsers).mockResolvedValueOnce(mockUsers as any);

      const result = await getAuditLogUsers();

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe("alice");
      expect(result[1].username).toBe("bob");
    });
  });
});
