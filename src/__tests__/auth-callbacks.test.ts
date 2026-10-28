import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  User: { findById: vi.fn(), findOne: vi.fn(), exists: vi.fn(), create: vi.fn(), countDocuments: vi.fn() },
}));

vi.mock("next-auth", () => ({ default: () => ({ handlers: {}, auth: m.auth, signIn: vi.fn(), signOut: vi.fn(), unstable_update: vi.fn() }) }));
vi.mock("next-auth/providers/credentials", () => ({ default: (c: unknown) => c }));
vi.mock("next-auth/providers/google", () => ({ default: (c: unknown) => c }));
vi.mock("../lib/db/mongodb", () => ({ connectMongo: vi.fn() }));
vi.mock("../models", () => ({ User: m.User }));

import { authConfig } from "../auth";

const { session: sessionCallback, signIn: signInCallback } = authConfig.callbacks;

function dbUser(user: unknown) {
  m.User.findById.mockReturnValueOnce({ select: () => ({ lean: () => Promise.resolve(user) }) });
}

const call = (role = "cashier") =>
  sessionCallback({ session: { user: { id: "u1" }, expires: "" }, token: { userId: "u1", role } } as never) as Promise<{ user: { role?: string } } | null>;

const google = { provider: "google", providerAccountId: "g1", type: "oidc" } as never;

describe("auth callbacks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("session", () => {
    it("takes the role from the database, so a demotion applies on the next request", async () => {
      dbUser({ role: "user", isActive: true });
      expect((await call("cashier"))?.user.role).toBe("user");
    });

    it("signs out a deactivated or deleted user", async () => {
      dbUser({ role: "admin", isActive: false });
      expect(await call()).toBeNull();
      dbUser({ role: "admin", isActive: true, isDeleted: true });
      expect(await call()).toBeNull();
    });
  });

  describe("signIn with Google", () => {
    it("never signs into a password account just because the email matches", async () => {
      m.auth.mockResolvedValueOnce(null);
      m.User.findOne.mockResolvedValueOnce(null);
      m.User.exists.mockResolvedValueOnce({ _id: "victim" });
      const user = { email: "Victim@Gmail.com", name: "Victim" };
      expect(await signInCallback({ user, account: google } as never)).toBe("/login?error=GoogleEmailInUse");
      expect(m.User.findOne).toHaveBeenCalledWith({ providerAccountId: "g1" });
      expect(m.User.exists).toHaveBeenCalledWith({ email: "victim@gmail.com" });
      expect(m.User.create).not.toHaveBeenCalled();
    });

    it("signs in the account already linked to this Google id", async () => {
      m.auth.mockResolvedValueOnce(null);
      m.User.findOne.mockResolvedValueOnce({ _id: "u1", username: "ann", role: "user", isActive: true, avatarUrl: "a.png", save: vi.fn() });
      const user: Record<string, unknown> = { email: "ann@x.com" };
      expect(await signInCallback({ user, account: google } as never)).toBe(true);
      expect(user).toMatchObject({ id: "u1", name: "ann" });
    });
  });
});
