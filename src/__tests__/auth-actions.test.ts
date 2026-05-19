import { describe, it, expect, vi, beforeEach } from "vitest";
import { changePassword, changeOwnPassword } from "../app/auth-actions";

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
}));

// Mock User model
vi.mock("../models", () => ({
  User: {
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

import { auth } from "../auth";

describe("Authentication Action Validations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("changePassword", () => {
    it("should throw 'Unauthorized' if no session exists", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.append("password", "newpassword123");
      formData.append("confirmPassword", "newpassword123");

      await expect(changePassword(formData)).rejects.toThrow("Unauthorized");
    });

    it("should throw error if password is less than 6 characters", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user_123" },
        expires: "9999",
      });

      const formData = new FormData();
      formData.append("password", "12345");
      formData.append("confirmPassword", "12345");

      await expect(changePassword(formData)).rejects.toThrow("Password must be at least 6 characters long");
    });

    it("should throw error if password and confirmPassword do not match", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user_123" },
        expires: "9999",
      });

      const formData = new FormData();
      formData.append("password", "password123");
      formData.append("confirmPassword", "different123");

      await expect(changePassword(formData)).rejects.toThrow("Passwords do not match");
    });
  });

  describe("changeOwnPassword", () => {
    it("should throw error if newPassword and confirmPassword do not match", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user_123" },
        expires: "9999",
      });

      const formData = new FormData();
      formData.append("newPassword", "password123");
      formData.append("confirmPassword", "different123");

      await expect(changeOwnPassword(formData)).rejects.toThrow("Passwords do not match");
    });
  });
});
