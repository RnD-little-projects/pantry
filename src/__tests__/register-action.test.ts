import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerAction } from "../app/register/actions";

// Mock mongodb (source imports "@/lib/db/mongodb"; resolved to the same file)
vi.mock("../lib/db/mongodb", () => ({
  connectMongo: vi.fn().mockResolvedValue(true),
}));

// Mock models
vi.mock("../models", () => ({
  User: {
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
}));

// Mock auth signIn
vi.mock("../auth", () => ({
  signIn: vi.fn().mockResolvedValue({}),
}));

// next-auth's ESM entry can't resolve "next/server" under vitest
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed") } }));

import { connectMongo } from "../lib/db/mongodb";
import { User } from "../models";
import { signIn } from "../auth";
import { AuthError } from "next-auth";

function leanResult(v: unknown) {
  return { select: () => ({ lean: () => Promise.resolve(v) }) } as never;
}

describe("registerAction validation", () => {
  const OLD_ALLOW = process.env.ALLOW_REGISTRATION;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALLOW_REGISTRATION;
  });

  afterEach(() => {
    if (OLD_ALLOW === undefined) {
      delete process.env.ALLOW_REGISTRATION;
    } else {
      process.env.ALLOW_REGISTRATION = OLD_ALLOW;
    }
  });

  function form(entries: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) fd.append(k, v);
    return fd;
  }

  it("returns disabled error when registration is turned off", async () => {
    process.env.ALLOW_REGISTRATION = "false";
    const res = await registerAction(
      form({ username: "alice", password: "password123", confirmPassword: "password123" }),
    );
    expect(res).toEqual({
      error: "Account registration is currently disabled by administrator.",
    });
    expect(connectMongo).not.toHaveBeenCalled();
  });

  it("returns error when username is shorter than 3 characters", async () => {
    const res = await registerAction(
      form({ username: "ab", password: "password123", confirmPassword: "password123" }),
    );
    expect(res).toEqual({ error: "Username must be at least 3 characters." });
    expect(connectMongo).not.toHaveBeenCalled();
  });

  it("returns error when password is shorter than 8 characters", async () => {
    const res = await registerAction(
      form({ username: "alice", password: "short", confirmPassword: "short" }),
    );
    expect(res).toEqual({ error: "Password must be at least 8 characters." });
    expect(connectMongo).not.toHaveBeenCalled();
  });

  it("returns error when passwords do not match", async () => {
    const res = await registerAction(
      form({ username: "alice", password: "password123", confirmPassword: "different123" }),
    );
    expect(res).toEqual({ error: "Passwords do not match." });
    expect(connectMongo).not.toHaveBeenCalled();
  });

  describe("after validation", () => {
    const valid = { username: "alice", email: "Alice@X.com", password: "password123", confirmPassword: "password123" };
    const OLD_FIRST = process.env.ALLOW_FIRST_LOGIN_ADMIN;

    beforeEach(() => {
      vi.mocked(signIn).mockResolvedValue({});
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      if (OLD_FIRST === undefined) delete process.env.ALLOW_FIRST_LOGIN_ADMIN;
      else process.env.ALLOW_FIRST_LOGIN_ADMIN = OLD_FIRST;
    });

    it("rejects a taken username or email", async () => {
      vi.mocked(User.findOne).mockReturnValueOnce(leanResult({ _id: "x" }));
      expect(await registerAction(form(valid))).toEqual({ error: "Username or email is already in use." });
      expect(User.findOne).toHaveBeenCalledWith({ $or: [{ username: { $regex: /^alice$/i } }, { email: "alice@x.com" }] });
    });

    it("creates a regular user and signs them in", async () => {
      vi.mocked(User.findOne).mockReturnValueOnce(leanResult(null));
      vi.mocked(User.countDocuments).mockResolvedValueOnce(5 as never);
      expect(await registerAction(form(valid))).toEqual({ success: true });
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: "alice", email: "alice@x.com", passwordHash: "hashed", role: "user" }),
      );
    });

    it("makes the first user admin only when ALLOW_FIRST_LOGIN_ADMIN is true", async () => {
      process.env.ALLOW_FIRST_LOGIN_ADMIN = "true";
      vi.mocked(User.findOne).mockReturnValueOnce(leanResult(null));
      vi.mocked(User.countDocuments).mockResolvedValueOnce(0 as never);
      await registerAction(form(valid));
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
    });

    it("reports a failed auto sign-in", async () => {
      vi.mocked(User.findOne).mockReturnValueOnce(leanResult(null));
      vi.mocked(User.countDocuments).mockResolvedValueOnce(1 as never);
      vi.mocked(signIn).mockRejectedValueOnce(new AuthError());
      expect(await registerAction(form(valid))).toEqual({ error: "Successfully registered but failed auto sign-in." });
    });

    it("hides database errors from the user", async () => {
      vi.mocked(connectMongo).mockRejectedValueOnce(new Error("db down"));
      expect(await registerAction(form(valid))).toEqual({ error: "Registration failed. Please try again." });
    });

    it("reports a duplicate from two signups at once as a taken name", async () => {
      vi.mocked(User.findOne).mockReturnValueOnce(leanResult(null));
      vi.mocked(User.countDocuments).mockResolvedValueOnce(1 as never);
      vi.mocked(User.create).mockRejectedValueOnce(Object.assign(new Error("E11000 duplicate key"), { code: 11000 }));
      expect(await registerAction(form(valid))).toEqual({ error: "Username or email is already in use." });
    });
  });
});
