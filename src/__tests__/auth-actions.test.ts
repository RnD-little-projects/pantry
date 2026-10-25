import { describe, it, expect, vi, beforeEach } from "vitest";
import { changePassword } from "../app/auth-actions";

vi.mock("../lib/db/mongodb", () => ({
  connectMongo: vi.fn().mockResolvedValue(true),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

vi.mock("../auth", () => ({
  auth: vi.fn(),
  unstable_update: vi.fn().mockResolvedValue({}),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const findById = vi.hoisted(() => vi.fn());
vi.mock("../models", () => ({
  User: {
    findById,
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

import bcrypt from "bcryptjs";
import { auth, unstable_update } from "../auth";
import { User } from "../models";

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

function dbUser(user: unknown) {
  findById.mockReturnValueOnce({ select: () => ({ lean: () => Promise.resolve(user) }) });
}

describe("changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_123" }, expires: "9999" });
  });

  it("throws Unauthorized without a session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    await expect(changePassword(form({ newPassword: "newpassword", confirmPassword: "newpassword" }))).rejects.toThrow("Unauthorized");
  });

  it("rejects a password shorter than 8 characters", async () => {
    await expect(changePassword(form({ newPassword: "1234567", confirmPassword: "1234567" }))).rejects.toThrow(
      "Password must be at least 8 characters long",
    );
  });

  it("rejects mismatched passwords", async () => {
    await expect(changePassword(form({ newPassword: "password123", confirmPassword: "different123" }))).rejects.toThrow(
      "Passwords do not match",
    );
  });

  it("requires the current password for a normal change", async () => {
    dbUser({ passwordHash: "old_hash", forcePasswordChange: false });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    await expect(
      changePassword(form({ currentPassword: "wrong", newPassword: "newpassword", confirmPassword: "newpassword" })),
    ).rejects.toThrow("Current password is incorrect");
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("stores the new hash when the current password is right", async () => {
    dbUser({ passwordHash: "old_hash", forcePasswordChange: false });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    expect(
      await changePassword(form({ currentPassword: "oldpassword", newPassword: "newpassword", confirmPassword: "newpassword" })),
    ).toEqual({ success: true });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user_123", { passwordHash: "hashed_password", forcePasswordChange: false });
    expect(unstable_update).not.toHaveBeenCalled();
  });

  it("skips the current password after an admin reset and clears the force flag", async () => {
    dbUser({ passwordHash: "temp_hash", forcePasswordChange: true });
    expect(await changePassword(form({ newPassword: "newpassword", confirmPassword: "newpassword" }))).toEqual({ success: true });
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(unstable_update).toHaveBeenCalledWith({ user: { forcePasswordChange: false } });
  });
});
