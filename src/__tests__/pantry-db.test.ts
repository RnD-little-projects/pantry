import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mongoose query stand-in: chainable methods, awaitable result.
function q<T>(result: T) {
  const chain: Record<string, unknown> = {};
  for (const m of ["sort", "limit", "skip", "populate", "select", "lean"]) chain[m] = () => chain;
  chain.then = (res: (v: T) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
  return chain as never;
}

const m = vi.hoisted(() => {
  const orderSave = vi.fn();
  const Order = Object.assign(
    vi.fn(function (this: Record<string, unknown>, doc: Record<string, unknown>) {
      Object.assign(this, doc);
      this.save = orderSave;
    }),
    { findOne: vi.fn(), find: vi.fn(), updateMany: vi.fn(), countDocuments: vi.fn() },
  );
  return {
    orderSave,
    Order,
    AuditLog: { create: vi.fn(), findById: vi.fn(), findByIdAndDelete: vi.fn(), find: vi.fn(), distinct: vi.fn() },
    Product: { find: vi.fn(), findOne: vi.fn(), findById: vi.fn(), findByIdAndUpdate: vi.fn(), create: vi.fn() },
    User: { findById: vi.fn(), find: vi.fn() },
    Category: { find: vi.fn(), findOneAndUpdate: vi.fn() },
    connectMongo: vi.fn(),
    fs: { existsSync: vi.fn(() => true), mkdirSync: vi.fn(), writeFileSync: vi.fn() },
  };
});

vi.mock("../lib/db/mongodb", () => ({ connectMongo: m.connectMongo }));
vi.mock("../models", () => ({
  AuditLog: m.AuditLog,
  Order: m.Order,
  Product: m.Product,
  User: m.User,
  Category: m.Category,
}));
vi.mock("fs", () => ({ default: m.fs, ...m.fs }));

import * as db from "../lib/pantry-db";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

function orderDoc(overrides: Record<string, unknown> = {}) {
  return {
    publicId: "pub1",
    authorId: "user1",
    items: [] as Record<string, unknown>[],
    markModified: vi.fn(),
    save: vi.fn(),
    ...overrides,
  };
}

describe("pantry-db", () => {
  const OLD_URI = process.env.MONGODB_URI;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = "mongodb://localhost/test";
    m.connectMongo.mockResolvedValue(true);
    // Backups: make syncBackupToFile a no-op unless a test sets these up.
    m.User.findById.mockReturnValue(q(null));
  });

  afterEach(() => {
    if (OLD_URI === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = OLD_URI;
  });

  describe("when the database is unavailable", () => {
    it("read functions return empty fallbacks without MONGODB_URI", async () => {
      delete process.env.MONGODB_URI;
      expect(await db.getOverviewSessions()).toEqual([]);
      expect(await db.getMarketItems()).toEqual([]);
      expect(await db.getMarketItemMetrics()).toEqual({ total: 0, pending: 0, valuated: 0 });
      expect(await db.getOrderHistory("pub1")).toEqual([]);
      expect(await db.getLatestOrderPublicId()).toBeNull();
      expect(await db.getAllUsersWithOrderCounts()).toEqual([]);
      expect(await db.getOrdersByUser("u")).toEqual([]);
      expect(await db.getCategories()).toEqual([]);
      expect(await db.getAuditLogUsers()).toEqual([]);
      expect(await db.getPaginatedAuditLogs()).toEqual({ logs: [], hasMore: false });
    });

    it("treats a failed connection as not ready", async () => {
      m.connectMongo.mockRejectedValueOnce(new Error("down"));
      expect(await db.getMarketItems()).toEqual([]);
    });

    it("write functions throw", async () => {
      delete process.env.MONGODB_URI;
      await expect(db.removeOrderItem("p", "u", 0)).rejects.toThrow("DATABASE_NOT_READY");
      await expect(db.undoRemoveOrderItem("p", "u", "a")).rejects.toThrow("DATABASE_NOT_READY");
      await expect(db.updateOrderItemQuantity("p", "u", 0, "1")).rejects.toThrow("DATABASE_NOT_READY");
      await expect(db.createNewOrder("u", "Rice", "1")).rejects.toThrow("Database not ready");
      await expect(db.adminUpsertCategory("x")).rejects.toThrow("Database not ready");
      await expect(db.adminUpdateProduct(null, {})).rejects.toThrow("Database not ready");
      await expect(db.adminMergeProducts("a", "b")).rejects.toThrow("Database not ready");
      await expect(db.adminDeleteProduct("a")).rejects.toThrow("Database not ready");
    });
  });

  describe("getOverviewSessions", () => {
    it("queries by author when a userId is given and maps sessions", async () => {
      m.Order.find.mockReturnValueOnce(
        q([
          { _id: "o1", publicId: "p1", title: "", items: [{}, {}], status: "paid", updatedAt: hoursAgo(2), isPublic: false },
          { _id: "o2", publicId: "p2", title: "T", items: null, status: "draft", createdAt: hoursAgo(48) },
        ]),
      );
      const res = await db.getOverviewSessions("u1");
      expect(m.Order.find.mock.calls[0][0]).toEqual({ authorId: "u1" });
      expect(res[0]).toMatchObject({
        id: "o1", title: "Order p1", preview: "Paid", items: "2 items", updated: "2h ago", active: true, isPublic: false, status: "paid",
      });
      expect(res[1]).toMatchObject({ title: "T", preview: "Draft and shareable", items: "0 items", updated: "2d ago", active: true, isPublic: true });
    });

    it("queries public orders without a userId", async () => {
      m.Order.find.mockReturnValueOnce(q([{ publicId: "p", status: "finalized", updatedAt: new Date() }]));
      const res = await db.getOverviewSessions();
      expect(m.Order.find.mock.calls[0][0]).toEqual({ isPublic: true });
      expect(res[0]).toMatchObject({ preview: "Ready for checkout", updated: "Just now" });
    });
  });

  describe("getMarketItems", () => {
    it("formats price, status and aliases", async () => {
      m.Product.find.mockReturnValueOnce(
        q([
          { _id: "a", name: "Rice", price: 50, active: true, notes: "bag", aliases: [{ value: "bigas" }] },
          { _id: "b", name: "Egg", price: 7.5, active: true },
          { _id: "c", name: "Salt", price: null, active: true },
        ]),
      );
      const res = await db.getMarketItems();
      expect(res[0]).toEqual({ id: "a", name: "Rice", price: "₱50", status: "Active", note: "bag", aliases: ["bigas"] });
      expect(res[1]).toMatchObject({ price: "₱7.50", note: "", aliases: [] });
      expect(res[2]).toMatchObject({ price: "Pending", status: "Draft" });
    });
  });

  describe("getMarketItemMetrics", () => {
    it("counts priced vs pending products", async () => {
      m.Product.find.mockReturnValueOnce(q([{ price: 10 }, { price: 0 }, { price: null }, {}]));
      expect(await db.getMarketItemMetrics()).toEqual({ total: 4, pending: 3, valuated: 1 });
    });
  });

  describe("getSharedOrder", () => {
    it("throws ORDER_NOT_FOUND", async () => {
      m.Order.findOne.mockReturnValueOnce(q(null));
      await expect(db.getSharedOrder("p")).rejects.toThrow("ORDER_NOT_FOUND");
    });

    it("throws ORDER_NOT_PUBLIC for a private order viewed by a non-author", async () => {
      m.Order.findOne.mockReturnValueOnce(q({ publicId: "p", authorId: "a", isPublic: false }));
      await expect(db.getSharedOrder("p", "b")).rejects.toThrow("ORDER_NOT_PUBLIC");
    });

    it("lets the author view a private order and uses live product prices", async () => {
      m.Order.findOne.mockReturnValueOnce(
        q({
          publicId: "p",
          authorId: "a",
          isPublic: false,
          status: "draft",
          total: 999,
          items: [
            { _id: "i1", itemName: "Rice", quantity: 2, quantityLabel: "2", unitPrice: 10, productId: { price: 50 } },
            { itemName: "", quantity: 3, unit: "kg", unitPrice: 4, productId: null },
            { itemName: "Salt", productId: null },
          ],
        }),
      );
      const res = await db.getSharedOrder("p", "a");
      expect(res.isAuthor).toBe(true);
      expect(res.title).toBe("Order p");
      expect(res.items[0]).toMatchObject({ id: "i1", unitPrice: 50, lineTotal: 100, status: "draft" });
      expect(res.items[1]).toMatchObject({ id: "1", itemName: "Unnamed item", quantityLabel: "3 kg", unitPrice: 4, lineTotal: 12 });
      expect(res.items[2]).toMatchObject({ unitPrice: null, lineTotal: 0 });
      expect(res.subtotal).toBe(112);
      // Draft orders ignore stored totals.
      expect(res.total).toBe(112);
      expect(res.archivedAtLabel).toBeNull();
    });

    it("freezes unit prices and uses the stored total for archived orders", async () => {
      m.Order.findOne.mockReturnValueOnce(
        q({
          publicId: "p",
          isPublic: true,
          status: "archived",
          total: 30,
          archivedAt: new Date(),
          receiptUrl: "/r.jpg",
          items: [{ itemName: "Rice", quantity: 3, unitPrice: 10, productId: { price: 99 } }],
        }),
      );
      const res = await db.getSharedOrder("p");
      expect(res.items[0]).toMatchObject({ unitPrice: 10, lineTotal: 30 });
      expect(res.total).toBe(30);
      expect(res.receiptUrl).toBe("/r.jpg");
      expect(res.archivedAtLabel).toBe("Just now");
      expect(res.isAuthor).toBe(false);
    });
  });

  describe("appendOrderItem", () => {
    it("throws ORDER_NOT_FOUND", async () => {
      m.Order.findOne.mockResolvedValueOnce(null);
      await expect(db.appendOrderItem("p", "u", "Rice", "1")).rejects.toThrow("ORDER_NOT_FOUND");
    });

    it("throws FORBIDDEN for a non-author", async () => {
      m.Order.findOne.mockResolvedValueOnce(orderDoc({ authorId: "x" }));
      const err = await db.appendOrderItem("p", "u", "Rice", "1").catch((e) => e);
      expect(err.code).toBe("FORBIDDEN");
    });

    it("adds a priced item from a matching product and logs it", async () => {
      const order = orderDoc({ authorId: "u" });
      m.Order.findOne.mockResolvedValueOnce(order);
      m.Product.findOne.mockResolvedValueOnce({ _id: "prod", name: "Rice", normalizedName: "rice", price: 50 });
      const res = await db.appendOrderItem("p", "u", " rice ", "3 kg");
      expect(order.items[0]).toMatchObject({ productId: "prod", itemName: "Rice", quantity: 3, quantityLabel: "3 kg", unitPrice: 50, lineTotal: 150, status: "priced" });
      expect(order.save).toHaveBeenCalled();
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "item_add", targetId: "p" }));
      expect(res).toMatchObject({ id: "0", itemName: "Rice", unitPrice: 50, lineTotal: 150, status: "priced" });
    });

    it("defaults quantity to 1 and creates an unknown product as draft", async () => {
      const order = orderDoc({ authorId: "u" });
      m.Order.findOne.mockResolvedValueOnce(order);
      m.Product.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      m.Product.create.mockResolvedValueOnce({ _id: "new", name: "Kale", normalizedName: "kale" });
      const res = await db.appendOrderItem("p", "u", "Kale", "a bunch");
      expect(m.Product.create).toHaveBeenCalledWith({ name: "Kale", normalizedName: "kale", active: true });
      expect(order.items[0]).toMatchObject({ quantity: 1, lineTotal: 0, status: "draft" });
      expect(res.unitPrice).toBeNull();
    });

    it("reactivates an inactive product with the same name", async () => {
      const order = orderDoc({ authorId: "u" });
      const inactive = { _id: "old", name: "Kale", normalizedName: "kale", active: false, save: vi.fn() };
      m.Order.findOne.mockResolvedValueOnce(order);
      m.Product.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(inactive);
      await db.appendOrderItem("p", "u", "Kale", "1");
      expect(inactive.active).toBe(true);
      expect(inactive.save).toHaveBeenCalled();
      expect(m.Product.create).not.toHaveBeenCalled();
    });

    it("writes a backup file for the order", async () => {
      const order = orderDoc({ authorId: "u" });
      m.Order.findOne
        .mockResolvedValueOnce(order)
        .mockReturnValueOnce(q({ publicId: "p", title: "Oct 1", items: [{ itemName: "Rice", quantity: 2 }, { itemName: "Rice", quantity: 1 }, { quantity: 4 }] }));
      m.Product.findOne.mockResolvedValueOnce({ _id: "prod", name: "Rice", normalizedName: "rice", price: 1 });
      m.User.findById.mockReturnValueOnce(q({ username: "Ann B" }));
      await db.appendOrderItem("p", "u", "Rice", "1");
      const [file, content] = m.fs.writeFileSync.mock.calls[0];
      expect(String(file)).toMatch(/ann_b[\\/]oct-1-p\.txt$/);
      expect(content).toBe("Rice: 3\nUnnamed Item: 4");
    });
  });

  describe("updateOrderItemQuantity", () => {
    it("throws ORDER_NOT_FOUND / FORBIDDEN / ITEM_NOT_FOUND", async () => {
      m.Order.findOne.mockResolvedValueOnce(null);
      await expect(db.updateOrderItemQuantity("p", "u", 0, "1")).rejects.toThrow("ORDER_NOT_FOUND");
      m.Order.findOne.mockResolvedValueOnce(orderDoc({ authorId: "x" }));
      await expect(db.updateOrderItemQuantity("p", "u", 0, "1")).rejects.toThrow("Forbidden");
      m.Order.findOne.mockResolvedValueOnce(orderDoc({ authorId: "u" }));
      await expect(db.updateOrderItemQuantity("p", "u", 5, "1")).rejects.toThrow("ITEM_NOT_FOUND");
    });

    it("updates label and parsed quantity, and logs before/after", async () => {
      const order = orderDoc({ authorId: "u", items: [{ itemName: "Rice", quantity: 1, quantityLabel: "1", unitPrice: 5 }] });
      m.Order.findOne.mockResolvedValueOnce(order);
      const res = await db.updateOrderItemQuantity("p", "u", 0, "4 packs");
      expect(order.items[0]).toMatchObject({ quantity: 4, quantityLabel: "4 packs" });
      expect(m.AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: "quantity_update", before: { itemName: "Rice", quantityLabel: "1" }, after: { itemName: "Rice", quantityLabel: "4 packs" } }),
      );
      expect(res).toMatchObject({ id: "0", unitPrice: 5, lineTotal: 0, status: "draft" });
    });

    it("keeps the old numeric quantity when the label is not a number", async () => {
      const order = orderDoc({ authorId: "u", items: [{ itemName: "Rice", quantity: 2 }] });
      m.Order.findOne.mockResolvedValueOnce(order);
      await db.updateOrderItemQuantity("p", "u", 0, "some");
      expect(order.items[0].quantity).toBe(2);
    });
  });

  describe("removeOrderItem", () => {
    it("throws ORDER_NOT_FOUND", async () => {
      m.Order.findOne.mockResolvedValueOnce(null);
      await expect(db.removeOrderItem("p", "u", 0)).rejects.toThrow("ORDER_NOT_FOUND");
    });

    it("removes the item and stores it for undo", async () => {
      const item = { itemName: "Rice", quantityLabel: "2" };
      const order = orderDoc({ authorId: "u", items: [{ itemName: "Egg" }, item] });
      m.Order.findOne.mockResolvedValueOnce(order);
      expect(await db.removeOrderItem("p", "u", 1)).toBe(true);
      expect(order.items).toEqual([{ itemName: "Egg" }]);
      expect(m.AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: "item_remove", before: { itemName: "Rice", quantityLabel: "2", fullItem: item, index: 1 } }),
      );
    });
  });

  describe("undoRemoveOrderItem", () => {
    const log = { action: "item_remove", targetId: "p", before: { fullItem: { itemName: "Rice", quantityLabel: "2" }, index: 1 } };

    it("rejects a missing, wrong-action or wrong-order audit log", async () => {
      m.AuditLog.findById.mockResolvedValueOnce(null);
      await expect(db.undoRemoveOrderItem("p", "u", "l")).rejects.toThrow("INVALID_AUDIT_LOG");
      m.AuditLog.findById.mockResolvedValueOnce({ ...log, action: "item_add" });
      await expect(db.undoRemoveOrderItem("p", "u", "l")).rejects.toThrow("INVALID_AUDIT_LOG");
      m.AuditLog.findById.mockResolvedValueOnce({ ...log, targetId: "other" });
      await expect(db.undoRemoveOrderItem("p", "u", "l")).rejects.toThrow("INVALID_AUDIT_LOG");
    });

    it("throws ORDER_NOT_FOUND", async () => {
      m.AuditLog.findById.mockResolvedValueOnce(log);
      m.Order.findOne.mockResolvedValueOnce(null);
      await expect(db.undoRemoveOrderItem("p", "u", "l")).rejects.toThrow("ORDER_NOT_FOUND");
    });

    it("forbids non-author non-admins", async () => {
      m.AuditLog.findById.mockResolvedValueOnce(log);
      m.Order.findOne.mockResolvedValueOnce(orderDoc({ authorId: "x" }));
      m.User.findById.mockReturnValueOnce(q({ role: "user" }));
      await expect(db.undoRemoveOrderItem("p", "u", "l")).rejects.toThrow("FORBIDDEN");
    });

    it("re-inserts the item at its index and deletes the remove log", async () => {
      const order = orderDoc({ authorId: "x", items: [{ itemName: "A" }, { itemName: "B" }] });
      m.AuditLog.findById.mockResolvedValueOnce(log);
      m.Order.findOne.mockResolvedValueOnce(order);
      m.User.findById.mockReturnValueOnce(q({ role: "admin" }));
      expect(await db.undoRemoveOrderItem("p", "admin1", "l")).toBe(true);
      expect(order.items.map((i) => i.itemName)).toEqual(["A", "Rice", "B"]);
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "item_undo_remove" }));
      expect(m.AuditLog.findByIdAndDelete).toHaveBeenCalledWith("l");
    });
  });

  describe("getOrderHistory", () => {
    it("returns [] when there are no logs", async () => {
      m.AuditLog.find.mockReturnValueOnce(q([]));
      expect(await db.getOrderHistory("p")).toEqual([]);
    });

    it("maps audit logs to history entries", async () => {
      m.AuditLog.find.mockReturnValueOnce(
        q([
          { _id: "l1", action: "item_add", createdAt: "2026-01-02T10:00:00Z", after: { itemName: "Rice", quantityLabel: "2" } },
          { _id: "l2", action: "item_remove", createdAt: "2026-01-01T10:00:00Z", before: { itemName: "Egg", isAdminRemove: true } },
          { _id: "l3", action: "order_archive", createdAt: "2026-01-01T10:00:00Z", note: "Archived order" },
        ]),
      );
      const res = await db.getOrderHistory("p");
      expect(res[0]).toEqual({ id: "l1", date: "2026-01-02", item: "Rice", quantity: "2", action: "Item Add", rawAction: "item_add", isAdminRemove: false });
      expect(res[1]).toMatchObject({ item: "Egg", quantity: "-", isAdminRemove: true });
      expect(res[2]).toMatchObject({ item: "Archived order", action: "Order Archive" });
    });
  });

  describe("getLatestOrderPublicId", () => {
    it("excludes archived orders and returns the publicId", async () => {
      m.Order.findOne.mockReturnValueOnce(q({ publicId: "p9" }));
      expect(await db.getLatestOrderPublicId("u")).toBe("p9");
      expect(m.Order.findOne.mock.calls[0][0]).toEqual({ authorId: "u", status: { $ne: "archived" } });
    });

    it("returns null when nothing is found", async () => {
      m.Order.findOne.mockReturnValueOnce(q(null));
      expect(await db.getLatestOrderPublicId()).toBeNull();
    });
  });

  describe("createNewOrder", () => {
    it("refuses when the user already has an active order", async () => {
      m.Order.findOne.mockReturnValueOnce(q({ publicId: "existing" }));
      await expect(db.createNewOrder("u", "Rice", "1")).rejects.toThrow("already have an active order");
    });

    it("creates a public draft order with the first item", async () => {
      m.Order.findOne.mockReturnValueOnce(q(null));
      m.Product.findOne.mockResolvedValueOnce({ _id: "prod", name: "Rice", normalizedName: "rice", price: 20 });
      const publicId = await db.createNewOrder("u", "Rice", "2");
      expect(publicId).toMatch(/^[a-z0-9]+$/);
      const doc = m.Order.mock.calls[0][0] as Record<string, any>;
      expect(doc).toMatchObject({ publicId, authorId: "u", isPublic: true, status: "draft" });
      expect(doc.items[0]).toMatchObject({ itemName: "Rice", quantity: 2, unitPrice: 20, lineTotal: 40, status: "priced" });
      expect(m.orderSave).toHaveBeenCalled();
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "item_add", targetId: publicId }));
    });
  });

  describe("getAllUsersWithOrderCounts", () => {
    it("attaches order counts", async () => {
      m.User.find.mockReturnValueOnce(q([{ _id: "u1", username: "ann" }]));
      m.Order.countDocuments.mockResolvedValueOnce(3);
      expect(await db.getAllUsersWithOrderCounts()).toEqual([
        { id: "u1", username: "ann", email: null, avatarUrl: null, role: "user", orderCount: 3 },
      ]);
    });
  });

  describe("getOrdersByUser", () => {
    it("maps orders", async () => {
      m.Order.find.mockReturnValueOnce(q([{ _id: "o1", publicId: "p", status: "paid", items: [{}], updatedAt: new Date() }]));
      expect((await db.getOrdersByUser("u"))[0]).toMatchObject({
        id: "o1", title: "Order p", preview: "Paid", items: "1 items", active: false, isPublic: true, status: "paid",
      });
    });
  });

  describe("getCategories", () => {
    it("returns active categories", async () => {
      m.Category.find.mockReturnValueOnce(q([{ name: "Dairy" }]));
      expect(await db.getCategories()).toEqual([{ name: "Dairy" }]);
      expect(m.Category.find).toHaveBeenCalledWith({ active: true });
    });
  });

  describe("adminUpsertCategory", () => {
    it("upserts by slug and logs when an admin is given", async () => {
      m.Category.findOneAndUpdate.mockResolvedValueOnce({ _id: "c1" });
      await db.adminUpsertCategory("Fresh Fruit!", "admin");
      expect(m.Category.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: "fresh-fruit-" },
        { name: "Fresh Fruit!", slug: "fresh-fruit-", active: true },
        { upsert: true, new: true },
      );
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "category_upsert", targetId: "c1" }));
    });

    it("does not log without an admin", async () => {
      m.Category.findOneAndUpdate.mockResolvedValueOnce({ _id: "c1" });
      await db.adminUpsertCategory("Dairy");
      expect(m.AuditLog.create).not.toHaveBeenCalled();
    });
  });

  describe("adminUpdateProduct", () => {
    it("creates a product with normalized name and parsed aliases", async () => {
      m.Product.create.mockResolvedValueOnce({ _id: "p1", name: "Rice" });
      await db.adminUpdateProduct(null, { name: "Rice", aliases: " Bigas, , GRAIN " }, "admin");
      expect(m.Product.create).toHaveBeenCalledWith({
        name: "Rice",
        normalizedName: "rice",
        active: true,
        aliases: [{ value: "bigas", source: "manual" }, { value: "grain", source: "manual" }],
      });
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "product_create", targetId: "p1" }));
    });

    it("updates a product and syncs its price into draft orders", async () => {
      m.Product.findByIdAndUpdate.mockResolvedValueOnce({ name: "Rice" });
      await db.adminUpdateProduct("p1", { price: 55 }, "admin");
      expect(m.Order.updateMany).toHaveBeenCalledWith(
        { "items.productId": "p1", status: "draft" },
        { $set: { "items.$[elem].unitPrice": 55, "items.$[elem].status": "priced" } },
        { arrayFilters: [{ "elem.productId": "p1" }] },
      );
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "product_update" }));
    });

    it("marks synced items as draft when price is cleared, and skips sync when price is untouched", async () => {
      m.Product.findByIdAndUpdate.mockResolvedValue({ name: "Rice" });
      await db.adminUpdateProduct("p1", { price: null });
      expect(m.Order.updateMany.mock.calls[0][1].$set["items.$[elem].status"]).toBe("draft");
      await db.adminUpdateProduct("p1", { notes: "x" });
      expect(m.Order.updateMany).toHaveBeenCalledTimes(1);
      expect(m.AuditLog.create).not.toHaveBeenCalled();
    });
  });

  describe("adminMergeProducts", () => {
    it("throws when a product is missing or merged into itself", async () => {
      m.Product.findById.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: "b" });
      await expect(db.adminMergeProducts("a", "b")).rejects.toThrow("Product not found");
      m.Product.findById.mockResolvedValueOnce({ _id: "a" }).mockResolvedValueOnce({ _id: "a" });
      await expect(db.adminMergeProducts("a", "a")).rejects.toThrow("Cannot merge into itself");
    });

    it("merges aliases, repoints orders and deactivates the source", async () => {
      const source = { _id: "a", name: "Bigas", normalizedName: "bigas", aliases: [{ value: "rice" }, { value: "grain" }], save: vi.fn(), active: true };
      const target = { _id: "b", name: "Rice", normalizedName: "rice", aliases: [{ value: "kanin" }], save: vi.fn() };
      m.Product.findById.mockResolvedValueOnce(source).mockResolvedValueOnce(target);
      m.Order.find.mockReturnValueOnce(q([{ publicId: "p", authorId: "u" }]));
      expect(await db.adminMergeProducts("a", "b", "admin")).toBe(true);
      expect(target.aliases.map((a: { value: string }) => a.value).sort()).toEqual(["bigas", "grain", "kanin"]);
      expect(target.save).toHaveBeenCalled();
      expect(m.Order.updateMany).toHaveBeenCalledWith(
        { "items.productId": "a" },
        { $set: { "items.$[elem].productId": "b", "items.$[elem].itemName": "Rice" } },
        { arrayFilters: [{ "elem.productId": "a" }] },
      );
      expect(source.active).toBe(false);
      expect(source.save).toHaveBeenCalled();
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "product_merge" }));
    });
  });

  describe("adminDeleteProduct", () => {
    it("returns null when the product does not exist", async () => {
      m.Product.findByIdAndUpdate.mockResolvedValueOnce(null);
      expect(await db.adminDeleteProduct("x")).toBeNull();
    });

    it("soft-deletes and strips the product from orders with undo logs", async () => {
      const product = { name: "Rice", active: true };
      const order = orderDoc({ authorId: "u", items: [{ productId: "x", itemName: "Rice" }, { productId: "y", itemName: "Egg" }] });
      const untouched = orderDoc({ items: [{ productId: "y" }] });
      m.Product.findByIdAndUpdate.mockResolvedValueOnce(product);
      m.Order.find.mockResolvedValueOnce([order, untouched]);
      expect(await db.adminDeleteProduct("x", "admin")).toBe(product);
      expect(m.Product.findByIdAndUpdate).toHaveBeenCalledWith("x", { active: false });
      expect(order.items).toEqual([{ productId: "y", itemName: "Egg" }]);
      expect(order.save).toHaveBeenCalled();
      expect(untouched.save).not.toHaveBeenCalled();
      const actions = m.AuditLog.create.mock.calls.map((c) => c[0].action);
      expect(actions).toEqual(["product_delete", "item_remove"]);
      expect(m.AuditLog.create.mock.calls[1][0].before).toMatchObject({ index: 0, isAdminRemove: true });
    });
  });

  describe("getAuditLogUsers", () => {
    it("returns users who appear as audit actors", async () => {
      m.AuditLog.distinct.mockResolvedValueOnce(["u1"]);
      m.User.find.mockReturnValueOnce(q([{ _id: "u1", username: "ann" }]));
      expect(await db.getAuditLogUsers()).toEqual([{ _id: "u1", username: "ann" }]);
      expect(m.User.find.mock.calls[0][0]).toEqual({ _id: { $in: ["u1"] } });
    });
  });

  describe("getPaginatedAuditLogs", () => {
    it("fetches limit + 1 to compute hasMore", async () => {
      m.AuditLog.find.mockReturnValueOnce(q([{ _id: 1 }, { _id: 2 }, { _id: 3 }]));
      expect(await db.getPaginatedAuditLogs(1, 2)).toEqual({ logs: [{ _id: 1 }, { _id: 2 }], hasMore: true });
    });

    it("returns hasMore=false on the last page", async () => {
      m.AuditLog.find.mockReturnValueOnce(q([{ _id: 1 }]));
      expect(await db.getPaginatedAuditLogs(2, 2)).toEqual({ logs: [{ _id: 1 }], hasMore: false });
    });

    it("builds search and filter queries", async () => {
      m.User.find.mockReturnValueOnce(q([{ _id: "u1" }]));
      m.AuditLog.find.mockReturnValueOnce(q([]));
      await db.getPaginatedAuditLogs(1, 20, " ann ", ["u2"], ["item_add"]);
      const query = m.AuditLog.find.mock.calls[0][0];
      expect(query.$or).toContainEqual({ note: { $regex: "ann", $options: "i" } });
      expect(query.$or).toContainEqual({ actorId: { $in: ["u1"] } });
      expect(query.actorId).toEqual({ $in: ["u2"] });
      expect(query.action).toEqual({ $in: ["item_add"] });
    });
  });
});
