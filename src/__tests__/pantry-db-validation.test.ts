import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  appendOrderItem,
  updateOrderItemQuantity,
  removeOrderItem,
  getSharedOrder,
} from "../lib/pantry-db";

// Mock mongodb (source imports "./db/mongodb" relative to src/lib)
vi.mock("../lib/db/mongodb", () => ({
  connectMongo: vi.fn().mockResolvedValue(true),
}));

// Mock models (source imports "@/models")
vi.mock("../models", () => ({
  AuditLog: { create: vi.fn() },
  Order: { findOne: vi.fn(), find: vi.fn() },
  Product: { find: vi.fn(), findOne: vi.fn() },
  User: { findById: vi.fn() },
}));

import { Order } from "../models";

const DUMMY_URI = "mongodb://localhost:27017/pantry-test";

describe("pantry-db validation / authorization", () => {
  const OLD_URI = process.env.MONGODB_URI;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (OLD_URI === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = OLD_URI;
    }
  });

  it("appendOrderItem rejects item names shorter than 2 characters", async () => {
    process.env.MONGODB_URI = DUMMY_URI;
    const err = await appendOrderItem("pub1", "user1", "a", "2kg").catch((e) => e);
    expect(err.message).toBe("Item name must be at least 2 characters");
    expect(err.code).toBe("ITEM_NAME_TOO_SHORT");
  });

  it("appendOrderItem requires a quantity label", async () => {
    process.env.MONGODB_URI = DUMMY_URI;
    const err = await appendOrderItem("pub1", "user1", "Rice", "   ").catch((e) => e);
    expect(err.message).toBe("Quantity label is required");
    expect(err.code).toBe("QUANTITY_LABEL_TOO_SHORT");
  });

  it("updateOrderItemQuantity requires a quantity label", async () => {
    process.env.MONGODB_URI = DUMMY_URI;
    const err = await updateOrderItemQuantity("pub1", "user1", 0, "Rice", "  ").catch((e) => e);
    expect(err.message).toBe("Quantity label is required");
    expect(err.code).toBe("QUANTITY_LABEL_TOO_SHORT");
  });

  it("removeOrderItem throws ITEM_NOT_FOUND for an out-of-range index", async () => {
    process.env.MONGODB_URI = DUMMY_URI;
    vi.mocked(Order.findOne).mockResolvedValueOnce({
      authorId: "user1",
      items: [],
      markModified: vi.fn(),
      save: vi.fn(),
    });
    const err = await removeOrderItem("pub1", "user1", 0, "Rice").catch((e) => e);
    expect(err.message).toBe("ITEM_NOT_FOUND");
  });

  it("removeOrderItem throws Forbidden for a non-author", async () => {
    process.env.MONGODB_URI = DUMMY_URI;
    vi.mocked(Order.findOne).mockResolvedValueOnce({
      authorId: "someone-else",
      items: [{ itemName: "Rice" }],
      markModified: vi.fn(),
      save: vi.fn(),
    });
    const err = await removeOrderItem("pub1", "user1", 0, "Rice").catch((e) => e);
    expect(err.message).toBe("Forbidden");
    expect(err.code).toBe("FORBIDDEN");
  });

});
