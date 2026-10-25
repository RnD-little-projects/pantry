import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  attachGoogleAction,
  changeEmailAction,
  logoutAction,
} from "../app/auth-actions";
import { cn } from "../lib/utils";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Mock mongodb
vi.mock("../lib/db/mongodb", () => ({
  connectMongo: vi.fn().mockResolvedValue(true),
}));

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}));

// Mock auth
vi.mock("../auth", () => ({
  auth: vi.fn(),
  unstable_update: vi.fn().mockResolvedValue({}),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock User model (needs findOne for changeEmailAction)
vi.mock("../models", () => ({
  User: {
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

import { auth, unstable_update, signIn, signOut } from "../auth";
import type { Session } from "next-auth";

// auth is overloaded; pin the session-returning signature for mocking
const mockAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);
import { User } from "../models";

describe("auth-actions extended validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function session() {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user_123" },
      expires: "9999",
    });
  }

  it("changeEmailAction rejects an invalid email", async () => {
    session();
    const fd = new FormData();
    fd.append("email", "not-an-email");
    await expect(changeEmailAction(fd)).rejects.toThrow(
      "Please enter a valid email address",
    );
  });

  it("changeEmailAction rejects an email owned by another account", async () => {
    session();
    vi.mocked(User.findOne).mockResolvedValueOnce({ _id: "other_user" });
    const fd = new FormData();
    fd.append("email", "taken@example.com");
    await expect(changeEmailAction(fd)).rejects.toThrow(
      "This email is already in use by another account",
    );
  });
});

describe("auth-actions success paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user_123" }, expires: "9999" });
  });

  it("changeEmailAction normalizes and saves the email (own email is allowed)", async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce({ _id: "user_123" } as never);
    const fd = new FormData();
    fd.append("email", "  Me@Example.COM ");
    expect(await changeEmailAction(fd)).toEqual({ success: true, email: "me@example.com" });
    expect(unstable_update).toHaveBeenCalledWith({ user: { email: "me@example.com" } });
  });

  it("changeEmailAction throws Unauthorized without a session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(changeEmailAction(new FormData())).rejects.toThrow("Unauthorized");
  });

  it("logoutAction signs out without touching the shared AUTH_URL", async () => {
    delete process.env.AUTH_URL;
    await logoutAction();
    expect(process.env.AUTH_URL).toBeUndefined();
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });

  it("attachGoogleAction signs in with google", async () => {
    await attachGoogleAction();
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/" });
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });
});
