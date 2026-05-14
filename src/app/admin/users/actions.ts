"use server";

import { connectMongo } from "@/lib/db/mongodb";
import { User } from "@/models";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * Ensures the caller is an admin.
 */
async function ensureAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Fetches all users (excluding sensitive data).
 */
export async function getUsers() {
  await ensureAdmin();
  await connectMongo();
  const users = await User.find({ isDeleted: { $ne: true } })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();
  
  return JSON.parse(JSON.stringify(users));
}

/**
 * Updates a user's status.
 */
export async function updateUserStatus(userId: string, updates: { isActive?: boolean; role?: string; isDeleted?: boolean }) {
  await ensureAdmin();
  await connectMongo();
  
  await User.findByIdAndUpdate(userId, updates);
  revalidatePath("/admin/users");
}

/**
 * Soft deletes a user.
 */
export async function softDeleteUser(userId: string) {
  await ensureAdmin();
  await connectMongo();
  
  await User.findByIdAndUpdate(userId, { isDeleted: true, isActive: false });
  revalidatePath("/admin/users");
}

/**
 * Resets a user's password to a randomly generated one.
 */
export async function resetUserPassword(userId: string) {
  await ensureAdmin();
  await connectMongo();
  
  // Generate a random 10-character password
  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  
  await User.findByIdAndUpdate(userId, {
    passwordHash,
    forcePasswordChange: true
  });
  
  revalidatePath("/admin/users");
  
  return { tempPassword };
}

/**
 * Updates a user's basic info.
 */
export async function updateUserInfo(userId: string, data: { username: string; email?: string; role: string }) {
  await ensureAdmin();
  await connectMongo();
  
  await User.findByIdAndUpdate(userId, data);
  revalidatePath("/admin/users");
}
