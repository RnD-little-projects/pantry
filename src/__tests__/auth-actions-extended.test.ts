import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  attachGoogleAction,
  changeEmailAction,
  changeOwnPassword,
  changePassword,
  logoutAction,
} from "../app/auth-actions";
import { cn } from "../lib/utils";

const headers = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers }));
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
import { User } from "../models";

describe("auth-actions extended validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function session() {
    vi.mocked(auth).mockResolvedValueOnce({
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

  it("changeOwnPassword throws Unauthorized without a session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.append("newPassword", "password123");
    fd.append("confirmPassword", "password123");
    await expect(changeOwnPassword(fd)).rejects.toThrow("Unauthorized");
  });

  it("changeOwnPassword rejects a short new password", async () => {
    session();
    const fd = new FormData();
    fd.append("newPassword", "123");
    fd.append("confirmPassword", "123");
    await expect(changeOwnPassword(fd)).rejects.toThrow(
      "Password must be at least 6 characters long",
    );
  });
});

describe("auth-actions success paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_123" }, expires: "9999" });
  });

  it("changePassword hashes, clears the force flag and updates the session", async () => {
    const fd = new FormData();
    fd.append("password", "newpassword");
    fd.append("confirmPassword", "newpassword");
    expect(await changePassword(fd)).toEqual({ success: true });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user_123", { passwordHash: "hashed_password", forcePasswordChange: false });
    expect(unstable_update).toHaveBeenCalledWith({ user: { forcePasswordChange: false } });
  });

  it("changeOwnPassword stores the new hash", async () => {
    const fd = new FormData();
    fd.append("newPassword", "newpassword");
    fd.append("confirmPassword", "newpassword");
    expect(await changeOwnPassword(fd)).toEqual({ success: true });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user_123", { passwordHash: "hashed_password" });
  });

  it("changeEmailAction normalizes and saves the email (own email is allowed)", async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce({ _id: "user_123" } as never);
    const fd = new FormData();
    fd.append("email", "  Me@Example.COM ");
    expect(await changeEmailAction(fd)).toEqual({ success: true, email: "me@example.com" });
    expect(unstable_update).toHaveBeenCalledWith({ user: { email: "me@example.com" } });
  });

  it("changeEmailAction throws Unauthorized without a session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    await expect(changeEmailAction(new FormData())).rejects.toThrow("Unauthorized");
  });

  it("logoutAction sets AUTH_URL from forwarded headers and signs out", async () => {
    headers.mockResolvedValueOnce(new Headers({ "x-forwarded-host": "app.test", "x-forwarded-proto": "http" }));
    await logoutAction();
    expect(process.env.AUTH_URL).toBe("http://app.test/api/auth");
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });

  it("attachGoogleAction defaults to https and signs in with google", async () => {
    headers.mockResolvedValueOnce(new Headers({ host: "pantry.test" }));
    await attachGoogleAction();
    expect(process.env.AUTH_URL).toBe("https://pantry.test/api/auth");
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/" });
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });
});
