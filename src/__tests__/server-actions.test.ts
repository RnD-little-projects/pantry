import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  db: {
    adminUpdateProduct: vi.fn(),
    adminDeleteProduct: vi.fn(),
    adminMergeProducts: vi.fn(),
    getOrdersByUser: vi.fn(),
    createNewOrder: vi.fn(),
  },
  User: { find: vi.fn(), findOne: vi.fn(), findByIdAndUpdate: vi.fn(), create: vi.fn() },
  AuditLog: { create: vi.fn() },
  hash: vi.fn(),
}));

vi.mock("../auth", () => ({ auth: m.auth, signIn: m.signIn }));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "CredentialsSignin";
  },
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../lib/pantry-db", () => m.db);
vi.mock("../lib/db/mongodb", () => ({ connectMongo: vi.fn() }));
vi.mock("../models", () => ({ User: m.User, AuditLog: m.AuditLog }));
vi.mock("bcryptjs", () => ({ default: { hash: m.hash } }));

import { AuthError } from "next-auth";
import { signInAction } from "../app/login/actions";
import { startOrderAction } from "../app/new-order-action";
import { fetchUserOrdersAction } from "../app/admin/orders/actions";
import {
  saveProductAction,
  deleteProductAction,
  mergeProductsAction,
} from "../app/admin/products/actions";
import {
  getUsers,
  updateUserStatus,
  softDeleteUser,
  resetUserPassword,
  updateUserInfo,
  createUser,
} from "../app/admin/users/actions";

const lean = <T,>(v: T) => {
  const chain = { select: () => chain, sort: () => chain, lean: () => Promise.resolve(v) };
  return chain as never;
};

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

const asAdmin = () => m.auth.mockResolvedValue({ user: { id: "admin1", role: "admin" } });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("signInAction", () => {
  it("returns success when sign-in works", async () => {
    expect(await signInAction(form({ username: "ann", password: "pw" }))).toEqual({ success: true });
    expect(m.signIn).toHaveBeenCalledWith("credentials", { username: "ann", password: "pw", redirect: false });
  });

  it("maps credential failures", async () => {
    m.signIn.mockRejectedValueOnce(new AuthError());
    expect(await signInAction(form({}))).toEqual({ error: "CredentialsSignin" });
  });

  it("maps other auth errors to a generic message", async () => {
    const err = new AuthError();
    (err as unknown as { type: string }).type = "Other";
    m.signIn.mockRejectedValueOnce(err);
    expect(await signInAction(form({}))).toEqual({ error: "Something went wrong." });
  });

  it("rethrows non-auth errors (e.g. redirects)", async () => {
    m.signIn.mockRejectedValueOnce(new Error("boom"));
    await expect(signInAction(form({}))).rejects.toThrow("boom");
  });
});

describe("startOrderAction", () => {
  it("throws when signed out, whatever the form says", async () => {
    m.auth.mockResolvedValueOnce(null);
    await expect(startOrderAction(form({ itemName: "Rice", quantity: "1" }))).rejects.toThrow("Unauthorized");
  });

  it("requires item name and quantity", async () => {
    m.auth.mockResolvedValueOnce({ user: { id: "u1" } });
    await expect(startOrderAction(form({ itemName: "Rice" }))).rejects.toThrow("Missing item name or quantity");
  });

  it("uses the session user, creates the order and redirects", async () => {
    m.auth.mockResolvedValueOnce({ user: { id: "session-user" } });
    m.db.createNewOrder.mockResolvedValueOnce("pub9");
    await startOrderAction(form({ itemName: "Rice", quantity: "2" }));
    expect(m.db.createNewOrder).toHaveBeenCalledWith("session-user", "Rice", "2");
    expect(m.redirect).toHaveBeenCalledWith("/order-list/pub9");
  });
});

describe("fetchUserOrdersAction", () => {
  beforeEach(() => m.auth.mockResolvedValue({ user: { id: "c1", role: "cashier" } }));

  it("rejects users who are not admin or cashier", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.auth.mockResolvedValue({ user: { id: "u1", role: "user" } });
    expect(await fetchUserOrdersAction("u2")).toEqual({ success: false, error: "Error: Unauthorized" });
    expect(m.db.getOrdersByUser).not.toHaveBeenCalled();
  });

  it("wraps orders in a success result", async () => {
    m.db.getOrdersByUser.mockResolvedValueOnce([{ id: "o1" }]);
    expect(await fetchUserOrdersAction("u1")).toEqual({ success: true, orders: [{ id: "o1" }] });
  });

  it("returns an error result on failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.db.getOrdersByUser.mockRejectedValueOnce(new Error("db"));
    expect(await fetchUserOrdersAction("u1")).toEqual({ success: false, error: "Error: db" });
  });
});

describe("admin product actions", () => {
  beforeEach(() => {
    m.auth.mockResolvedValue({ user: { id: "admin1", role: "admin" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("all product actions reject users who are not admin or cashier", async () => {
    m.auth.mockResolvedValue({ user: { id: "u1", role: "user" } });
    const denied = { success: false, error: "Error: Unauthorized" };
    expect(await saveProductAction({})).toEqual(denied);
    expect(await deleteProductAction("p")).toEqual(denied);
    expect(await mergeProductsAction("a", "b")).toEqual(denied);
    expect(m.db.adminUpdateProduct).not.toHaveBeenCalled();
    expect(m.db.adminDeleteProduct).not.toHaveBeenCalled();
  });

  it("cashiers can save products", async () => {
    m.auth.mockResolvedValue({ user: { id: "c1", role: "cashier" } });
    expect(await saveProductAction({ name: "Rice" })).toEqual({ success: true });
  });

  it("saveProductAction splits id from data and revalidates", async () => {
    expect(await saveProductAction({ id: "p1", name: "Rice" })).toEqual({ success: true });
    expect(m.db.adminUpdateProduct).toHaveBeenCalledWith("p1", { name: "Rice" }, "admin1");
    expect(m.revalidatePath).toHaveBeenCalledWith("/market-list");
  });

  it("saveProductAction creates when id is empty", async () => {
    await saveProductAction({ id: "", name: "Rice" });
    expect(m.db.adminUpdateProduct).toHaveBeenCalledWith(null, { name: "Rice" }, "admin1");
  });

  it("deleteProductAction calls adminDeleteProduct", async () => {
    expect(await deleteProductAction("p1")).toEqual({ success: true });
    expect(m.db.adminDeleteProduct).toHaveBeenCalledWith("p1", "admin1");
  });

  it("mergeProductsAction calls adminMergeProducts", async () => {
    expect(await mergeProductsAction("a", "b")).toEqual({ success: true });
    expect(m.db.adminMergeProducts).toHaveBeenCalledWith("a", "b", "admin1");
  });

  it("all product actions return an error result on failure", async () => {
    const fail = () => Promise.reject(new Error("nope"));
    m.db.adminUpdateProduct.mockImplementation(fail);
    m.db.adminDeleteProduct.mockImplementation(fail);
    m.db.adminMergeProducts.mockImplementation(fail);
    const expected = { success: false, error: "Error: nope" };
    expect(await saveProductAction({})).toEqual(expected);
    expect(await deleteProductAction("p")).toEqual(expected);
    expect(await mergeProductsAction("a", "b")).toEqual(expected);
  });
});

describe("admin user actions", () => {
  it("every action rejects non-admins", async () => {
    m.auth.mockResolvedValue({ user: { id: "u1", role: "user" } });
    const msg = "Unauthorized: Admin access required";
    await expect(getUsers()).rejects.toThrow(msg);
    await expect(updateUserStatus("x", {})).rejects.toThrow(msg);
    await expect(softDeleteUser("x")).rejects.toThrow(msg);
    await expect(resetUserPassword("x")).rejects.toThrow(msg);
    await expect(updateUserInfo("x", { username: "a", role: "user" })).rejects.toThrow(msg);
    await expect(createUser({ username: "a" })).rejects.toThrow(msg);
    expect(m.User.find).not.toHaveBeenCalled();
  });

  describe("as admin", () => {
    beforeEach(asAdmin);

    it("getUsers excludes deleted users and password hashes", async () => {
      m.User.find.mockReturnValueOnce(lean([{ _id: "u1", username: "ann" }]));
      expect(await getUsers()).toEqual([{ _id: "u1", username: "ann" }]);
      expect(m.User.find).toHaveBeenCalledWith({ isDeleted: { $ne: true } });
    });

    it("updateUserStatus updates and logs before/after", async () => {
      m.User.findByIdAndUpdate.mockResolvedValueOnce({ username: "ann", isActive: true, role: "user" });
      await updateUserStatus("u1", { isActive: false });
      expect(m.User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { isActive: false });
      expect(m.AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: "admin1", action: "user_update", before: { isActive: true, role: "user", isDeleted: undefined } }),
      );
      expect(m.revalidatePath).toHaveBeenCalledWith("/admin/users");
    });

    it("softDeleteUser deactivates and flags the user", async () => {
      m.User.findByIdAndUpdate.mockResolvedValueOnce({ username: "ann" });
      await softDeleteUser("u1");
      expect(m.User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { isDeleted: true, isActive: false });
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "user_delete" }));
    });

    it("resetUserPassword sets a hashed temp password and forces a change", async () => {
      m.hash.mockResolvedValueOnce("hashed");
      m.User.findByIdAndUpdate.mockResolvedValueOnce({ username: "ann" });
      const { tempPassword } = await resetUserPassword("u1");
      expect(tempPassword.length).toBeGreaterThan(0);
      expect(m.hash).toHaveBeenCalledWith(tempPassword, 10);
      expect(m.User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { passwordHash: "hashed", forcePasswordChange: true });
    });

    it("updateUserInfo updates and logs", async () => {
      m.User.findByIdAndUpdate.mockResolvedValueOnce({ username: "old" });
      await updateUserInfo("u1", { username: "new", role: "cashier" });
      expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ after: { username: "new", role: "cashier" } }));
    });

    describe("createUser", () => {
      it("requires a username", async () => {
        await expect(createUser({})).rejects.toThrow("Username is required.");
      });

      it("rejects duplicate usernames and emails", async () => {
        m.User.findOne.mockResolvedValueOnce({ _id: "x" });
        await expect(createUser({ username: "ann" })).rejects.toThrow("Username already exists.");
        m.User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: "x" });
        await expect(createUser({ username: "ann", email: "a@b.c" })).rejects.toThrow("Email already exists.");
      });

      it("escapes regex characters when checking duplicates", async () => {
        m.User.findOne.mockResolvedValue(null);
        m.User.create.mockResolvedValueOnce({ _id: "n" });
        await createUser({ username: "a.b(", email: "x+y@z.com" });
        const usernameRe = m.User.findOne.mock.calls[0][0].username.$regex as RegExp;
        expect(usernameRe.test("a.b(")).toBe(true);
        expect(usernameRe.test("axb(")).toBe(false);
        expect((m.User.findOne.mock.calls[1][0].email.$regex as RegExp).test("X+Y@z.com")).toBe(true);
      });

      it("rejects a short password", async () => {
        m.User.findOne.mockResolvedValue(null);
        await expect(createUser({ username: "ann", password: "1234567" })).rejects.toThrow("Password must be at least 8 characters.");
      });

      it("creates the user with defaults and logs it", async () => {
        m.User.findOne.mockResolvedValue(null);
        m.hash.mockResolvedValueOnce("hashed");
        m.User.create.mockResolvedValueOnce({ _id: "new1" });
        await createUser({ username: "ann", email: "Ann@X.com", password: "secret12" });
        expect(m.User.create).toHaveBeenCalledWith({
          username: "ann",
          email: "ann@x.com",
          role: "user",
          passwordHash: "hashed",
          forcePasswordChange: false,
          isActive: true,
        });
        expect(m.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "user_create", targetId: "new1" }));
      });
    });
  });
});
