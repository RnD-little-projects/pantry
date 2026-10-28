import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  db: { appendOrderItem: vi.fn(), removeOrderItem: vi.fn(), undoRemoveOrderItem: vi.fn(), updateOrderItemQuantity: vi.fn() },
  Order: { findOne: vi.fn(), updateOne: vi.fn() },
  AuditLog: { create: vi.fn() },
  fsp: { readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() },
  fs: { existsSync: vi.fn(), mkdirSync: vi.fn(), readdirSync: vi.fn(), writeFileSync: vi.fn() },
}));

vi.mock("../auth", () => ({ auth: m.auth }));
vi.mock("../lib/pantry-db", () => m.db);
vi.mock("../lib/db/mongodb", () => ({ connectMongo: vi.fn() }));
vi.mock("../models", () => ({ Order: m.Order, AuditLog: m.AuditLog }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("fs/promises", () => ({ default: m.fsp, ...m.fsp }));
vi.mock("fs", () => ({ default: m.fs, ...m.fs }));

import { POST as addItem } from "../app/api/order-list/add-item/route";
import { POST as removeItem } from "../app/api/order-list/remove-item/route";
import { POST as undoItem } from "../app/api/order-list/undo-item/route";
import { POST as updateItem } from "../app/api/order-list/update-item/route";
import { POST as archive } from "../app/api/order-list/archive/route";
import { GET as qrCodes } from "../app/api/qr-codes/route";
import { GET as receipt } from "../app/api/receipts/[filename]/route";

const json = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });
const badJson = () => new Request("http://x", { method: "POST", body: "{nope" });
const coded = (message: string, code?: string) => Object.assign(new Error(message), { code });
const signedIn = () => m.auth.mockResolvedValue({ user: { id: "u1" } });

async function expectStatus(res: Response, status: number, body?: unknown) {
  expect(res.status).toBe(status);
  if (body !== undefined) expect(await res.json()).toEqual(body);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/order-list/add-item", () => {
  it("returns 500 when auth throws and 401 when signed out", async () => {
    m.auth.mockRejectedValueOnce(new Error("x"));
    await expectStatus(await addItem(json({})), 500);
    m.auth.mockResolvedValueOnce(null);
    await expectStatus(await addItem(json({})), 401);
  });

  it("validates the payload", async () => {
    signedIn();
    await expectStatus(await addItem(badJson()), 400, { error: "Invalid request payload" });
    await expectStatus(await addItem(json({ itemName: "Rice" })), 400, { error: "Missing publicId" });
  });

  it("adds the item with trimmed fields", async () => {
    signedIn();
    m.db.appendOrderItem.mockResolvedValueOnce({ id: "i1" });
    await expectStatus(await addItem(json({ publicId: " p ", itemName: " Rice ", quantityLabel: " 2 " })), 200, { item: { id: "i1" } });
    expect(m.db.appendOrderItem).toHaveBeenCalledWith("p", "u1", "Rice", "2");
  });

  it("maps domain errors to status codes", async () => {
    signedIn();
    const body = json({ publicId: "p" });
    m.db.appendOrderItem.mockRejectedValueOnce(coded("short", "ITEM_NAME_TOO_SHORT"));
    await expectStatus(await addItem(body.clone()), 400, { error: "short" });
    m.db.appendOrderItem.mockRejectedValueOnce(coded("Forbidden", "FORBIDDEN"));
    await expectStatus(await addItem(body.clone()), 403);
    m.db.appendOrderItem.mockRejectedValueOnce(coded("ORDER_NOT_FOUND", "ORDER_NOT_FOUND"));
    await expectStatus(await addItem(body.clone()), 404);
    // Unknown errors are logged, never shown
    m.db.appendOrderItem.mockRejectedValueOnce(coded("E11000 duplicate key"));
    await expectStatus(await addItem(body.clone()), 500, { error: "Unable to add item" });
  });
});

describe("POST /api/order-list/remove-item", () => {
  it("handles auth and payload errors", async () => {
    m.auth.mockRejectedValueOnce(new Error("x"));
    await expectStatus(await removeItem(json({})), 500);
    m.auth.mockResolvedValueOnce(null);
    await expectStatus(await removeItem(json({})), 401);
    signedIn();
    await expectStatus(await removeItem(badJson()), 400);
    await expectStatus(await removeItem(json({ publicId: "p", itemIndex: "0" })), 400, { error: "Missing required fields" });
  });

  it("removes and maps errors", async () => {
    signedIn();
    const body = { publicId: "p", itemIndex: 0, itemName: "Rice" };
    await expectStatus(await removeItem(json({ publicId: "p", itemIndex: 0 })), 400, { error: "Missing required fields" });
    await expectStatus(await removeItem(json(body)), 200, { success: true });
    expect(m.db.removeOrderItem).toHaveBeenCalledWith("p", "u1", 0, "Rice");
    m.db.removeOrderItem.mockRejectedValueOnce(coded("Forbidden", "FORBIDDEN"));
    await expectStatus(await removeItem(json(body)), 403);
    m.db.removeOrderItem.mockRejectedValueOnce(coded("This list changed. Refresh and try again.", "ITEM_CHANGED"));
    await expectStatus(await removeItem(json(body)), 409);
    m.db.removeOrderItem.mockRejectedValueOnce(coded("locked", "ORDER_LOCKED"));
    await expectStatus(await removeItem(json(body)), 409);
    m.db.removeOrderItem.mockRejectedValueOnce(coded("ITEM_NOT_FOUND", "ITEM_NOT_FOUND"));
    await expectStatus(await removeItem(json(body)), 404, { error: "ITEM_NOT_FOUND" });
    m.db.removeOrderItem.mockRejectedValueOnce(coded("ORDER_NOT_FOUND", "ORDER_NOT_FOUND"));
    await expectStatus(await removeItem(json(body)), 404);
  });
});

describe("POST /api/order-list/undo-item", () => {
  it("handles auth and payload errors", async () => {
    m.auth.mockRejectedValueOnce(new Error("x"));
    await expectStatus(await undoItem(json({})), 500);
    m.auth.mockResolvedValueOnce(null);
    await expectStatus(await undoItem(json({})), 401);
    signedIn();
    await expectStatus(await undoItem(badJson()), 400);
    await expectStatus(await undoItem(json({ publicId: "p" })), 400);
  });

  it("undoes and reports failures", async () => {
    signedIn();
    await expectStatus(await undoItem(json({ publicId: "p", auditLogId: "l" })), 200, { success: true });
    expect(m.db.undoRemoveOrderItem).toHaveBeenCalledWith("p", "u1", "l");
    m.db.undoRemoveOrderItem.mockRejectedValueOnce(coded("ALREADY_UNDONE", "ALREADY_UNDONE"));
    await expectStatus(await undoItem(json({ publicId: "p", auditLogId: "l" })), 409, { error: "ALREADY_UNDONE" });
    m.db.undoRemoveOrderItem.mockRejectedValueOnce(coded("INVALID_AUDIT_LOG", "INVALID_AUDIT_LOG"));
    await expectStatus(await undoItem(json({ publicId: "p", auditLogId: "l" })), 404);
    m.db.undoRemoveOrderItem.mockRejectedValueOnce(coded("FORBIDDEN", "FORBIDDEN"));
    await expectStatus(await undoItem(json({ publicId: "p", auditLogId: "l" })), 403);
  });
});

describe("POST /api/order-list/update-item", () => {
  it("requires auth and a valid payload", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expectStatus(await updateItem(json({})), 401);
    signedIn();
    await expectStatus(await updateItem(badJson()), 400);
    await expectStatus(await updateItem(json({ publicId: "p" })), 400, { error: "Invalid update payload" });
    await expectStatus(await updateItem(json({ publicId: "p", itemIndex: "abc" })), 400);
  });

  it("updates and maps errors", async () => {
    signedIn();
    const body = { publicId: "p", itemIndex: 1, itemName: "Rice", quantityLabel: "3" };
    m.db.updateOrderItemQuantity.mockResolvedValueOnce({ id: "i" });
    await expectStatus(await updateItem(json(body)), 200, { item: { id: "i" } });
    expect(m.db.updateOrderItemQuantity).toHaveBeenCalledWith("p", "u1", 1, "Rice", "3");
    m.db.updateOrderItemQuantity.mockRejectedValueOnce(coded("changed", "ITEM_CHANGED"));
    await expectStatus(await updateItem(json(body)), 409);
    m.db.updateOrderItemQuantity.mockRejectedValueOnce(coded("q", "QUANTITY_LABEL_TOO_SHORT"));
    await expectStatus(await updateItem(json(body)), 400);
    m.db.updateOrderItemQuantity.mockRejectedValueOnce(coded("f", "FORBIDDEN"));
    await expectStatus(await updateItem(json(body)), 403);
    m.db.updateOrderItemQuantity.mockRejectedValueOnce(coded("ITEM_NOT_FOUND", "ITEM_NOT_FOUND"));
    await expectStatus(await updateItem(json(body)), 404);
    m.db.updateOrderItemQuantity.mockRejectedValueOnce(coded("x"));
    await expectStatus(await updateItem(json(body)), 500);
  });
});

describe("POST /api/order-list/archive", () => {
  const archiveReq = (fields: Record<string, string | File>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return new Request("http://x", { method: "POST", body: fd });
  };

  it("rejects signed-out, missing id, unknown order and non-author", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expectStatus(await archive(archiveReq({})), 401);
    signedIn();
    await expectStatus(await archive(archiveReq({})), 400);
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve(null) });
    await expectStatus(await archive(archiveReq({ publicId: "p" })), 404);
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve({ authorId: "other" }) });
    await expectStatus(await archive(archiveReq({ publicId: "p" })), 403);
  });

  it("refuses to archive twice, so paid prices stay frozen", async () => {
    signedIn();
    const order = { authorId: "u1", status: "archived", items: [{ productId: { price: 99 }, unitPrice: 10, quantity: 1 }], save: vi.fn() };
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve(order) });
    await expectStatus(await archive(archiveReq({ publicId: "p" })), 409);
    expect(order.items[0].unitPrice).toBe(10);
    expect(order.save).not.toHaveBeenCalled();
  });

  it("rejects receipts that are not images, too big, or non-https links", async () => {
    signedIn();
    const order = () => ({ authorId: "u1", items: [], save: vi.fn() });
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve(order()) });
    await expectStatus(await archive(archiveReq({ publicId: "p", receipt: new File(["<html>"], "r.html", { type: "text/html" }) })), 400);
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve(order()) });
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "r.png", { type: "image/png" });
    await expectStatus(await archive(archiveReq({ publicId: "p", receipt: big })), 400);
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve(order()) });
    await expectStatus(await archive(archiveReq({ publicId: "p", receiptUrl: "http://tracker.example/x.png" })), 400);
    expect(m.fsp.writeFile).not.toHaveBeenCalled();
  });

  it("freezes prices, totals the order, stores the receipt and logs", async () => {
    signedIn();
    const order = {
      authorId: "u1",
      items: [
        { productId: { price: 10 }, unitPrice: 5, quantity: 2 },
        { productId: null, unitPrice: 3 },
        { productId: null },
      ],
      save: vi.fn(),
    } as Record<string, any>;
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve(order) });
    const file = new File(["img"], "r.png", { type: "image/png" });
    await expectStatus(await archive(archiveReq({ publicId: "p", receipt: file })), 200, { success: true });
    expect(order.items.map((i: any) => [i.unitPrice, i.lineTotal])).toEqual([[10, 20], [3, 3], [0, 0]]);
    expect(order).toMatchObject({ status: "archived", subtotal: 23, total: 23 });
    expect(order.receiptUrl).toMatch(/^\/api\/receipts\/receipt-p-\d+\.png$/);
    expect(m.fsp.writeFile).toHaveBeenCalled();
    expect(order.paymentMethod).toBe("receipt");
    expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "order_archive", note: "Archived order with receipt" }));
  });

  it("marks cash payment and ignores any receipt", async () => {
    signedIn();
    const order = { authorId: "u1", items: [], save: vi.fn() } as Record<string, any>;
    m.Order.findOne.mockReturnValueOnce({ populate: () => Promise.resolve(order) });
    const file = new File(["img"], "r.png", { type: "image/png" });
    await expectStatus(await archive(archiveReq({ publicId: "p", paymentMethod: "cash", receipt: file })), 200, { success: true });
    expect(order.paymentMethod).toBe("cash");
    expect(order.receiptUrl).toBeUndefined();
    expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ note: "Archived order paid in cash" }));
  });

  it("returns 500 on unexpected errors", async () => {
    m.auth.mockRejectedValueOnce(new Error("x"));
    await expectStatus(await archive(archiveReq({})), 500);
  });
});

describe("GET /api/qr-codes", () => {
  it("requires auth", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expectStatus(await qrCodes(), 401);
  });

  it("lists only image files", async () => {
    signedIn();
    m.fs.existsSync.mockReturnValueOnce(true);
    m.fs.readdirSync.mockReturnValueOnce(["a.png", "b.txt", "c.SVG"]);
    await expectStatus(await qrCodes(), 200, { images: ["a.png", "c.SVG"] });
  });

  it("returns no images, and writes nothing, when the folder is missing", async () => {
    signedIn();
    m.fs.existsSync.mockReturnValueOnce(false);
    await expectStatus(await qrCodes(), 200, { images: [] });
    expect(m.fs.mkdirSync).not.toHaveBeenCalled();
    expect(m.fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("returns 500 when the folder can't be read", async () => {
    signedIn();
    m.fs.existsSync.mockImplementationOnce(() => {
      throw new Error("io");
    });
    await expectStatus(await qrCodes(), 500);
  });
});

describe("GET /api/receipts/[filename]", () => {
  const get = (filename: string) => receipt(new Request("http://x"), { params: Promise.resolve({ filename }) });

  it("requires auth", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expectStatus(await get("a.png"), 401);
  });

  it("blocks path traversal", async () => {
    signedIn();
    for (const name of ["../x", "a/b", "a\\b"]) await expectStatus(await get(name), 400);
    expect(m.fsp.readFile).not.toHaveBeenCalled();
  });

  it("serves the file with a content type to staff", async () => {
    m.auth.mockResolvedValue({ user: { id: "c1", role: "cashier" } });
    m.fsp.readFile.mockResolvedValue(Buffer.from("img"));
    expect((await get("a.png")).headers.get("Content-Type")).toBe("image/png");
    expect((await get("a.gif")).headers.get("Content-Type")).toBe("image/gif");
    expect((await get("a.webp")).headers.get("Content-Type")).toBe("image/webp");
    expect((await get("a.jpg")).headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("serves a receipt to the order's owner and hides it from other users", async () => {
    signedIn();
    m.fsp.readFile.mockResolvedValue(Buffer.from("img"));
    m.Order.findOne.mockReturnValueOnce({ lean: () => Promise.resolve({ authorId: "u1" }) });
    await expectStatus(await get("receipt-ab-c_1-1700000000000.png"), 200);
    expect(m.Order.findOne.mock.calls[0][0]).toEqual({ publicId: "ab-c_1" });
    m.Order.findOne.mockReturnValueOnce({ lean: () => Promise.resolve({ authorId: "someone-else" }) });
    await expectStatus(await get("receipt-ab-c_1-1700000000000.png"), 404);
    await expectStatus(await get("not-a-receipt.png"), 404);
  });

  it("returns 404 for a missing file", async () => {
    m.auth.mockResolvedValue({ user: { id: "a1", role: "admin" } });
    m.fsp.readFile.mockRejectedValueOnce(new Error("ENOENT"));
    await expectStatus(await get("a.png"), 404);
  });
});
