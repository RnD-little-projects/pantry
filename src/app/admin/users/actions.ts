"use server";

import { connectMongo } from "@/lib/db/mongodb";
import { User, AuditLog } from "@/models";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { MIN_PASSWORD_LENGTH, escapeRegex } from "@/lib/utils";

/**
 * Ensures the caller is an admin.
 */
async function ensureAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user.id as string;
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
  const adminId = await ensureAdmin();
  await connectMongo();
  
  const oldUser = await User.findByIdAndUpdate(userId, updates);
  await AuditLog.create({
    actorId: adminId,
    targetType: "user",
    targetId: userId,
    action: "user_update",
    before: { isActive: oldUser?.isActive, role: oldUser?.role, isDeleted: oldUser?.isDeleted },
    after: updates,
    note: `Admin updated user status/role for ${oldUser?.username}`
  });
  revalidatePath("/admin/users");
}

/**
 * Soft deletes a user.
 */
export async function softDeleteUser(userId: string) {
  const adminId = await ensureAdmin();
  await connectMongo();
  
  const oldUser = await User.findByIdAndUpdate(userId, { isDeleted: true, isActive: false });
  await AuditLog.create({
    actorId: adminId,
    targetType: "user",
    targetId: userId,
    action: "user_delete",
    before: { isDeleted: oldUser?.isDeleted, isActive: oldUser?.isActive },
    after: { isDeleted: true, isActive: false },
    note: `Admin soft-deleted user ${oldUser?.username}`
  });
  revalidatePath("/admin/users");
}

/**
 * Resets a user's password to a randomly generated one.
 */
export async function resetUserPassword(userId: string) {
  const adminId = await ensureAdmin();
  await connectMongo();
  
  const tempPassword = randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  
  const oldUser = await User.findByIdAndUpdate(userId, {
    passwordHash,
    forcePasswordChange: true
  });
  await AuditLog.create({
    actorId: adminId,
    targetType: "user",
    targetId: userId,
    action: "user_reset_password",
    note: `Admin reset password for user ${oldUser?.username}`
  });
  
  revalidatePath("/admin/users");
  
  return { tempPassword };
}

/**
 * Updates a user's basic info.
 */
export async function updateUserInfo(userId: string, data: { username: string; email?: string; role: string }) {
  const adminId = await ensureAdmin();
  await connectMongo();

  const username = data.username?.trim();
  if (!username) return { error: "Username is required." };
  if (await User.exists({ _id: { $ne: userId }, username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") } })) {
    return { error: "Username already exists." };
  }
  const email = data.email?.trim().toLowerCase();
  if (email && (await User.exists({ _id: { $ne: userId }, email }))) {
    return { error: "Email already exists." };
  }
  data = { ...data, username, email: email || undefined };
  
  // An admin saving the email vouches for it, which lets that Google account link on sign-in
  const oldUser = await User.findByIdAndUpdate(userId, { ...data, emailTrusted: Boolean(data.email) });
  await AuditLog.create({
    actorId: adminId,
    targetType: "user",
    targetId: userId,
    action: "user_update",
    before: { username: oldUser?.username, email: oldUser?.email, role: oldUser?.role },
    after: data,
    note: `Admin updated user info for ${oldUser?.username}`
  });
  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Creates a new user.
 */
export async function createUser(data: Record<string, unknown>) {
  const adminId = await ensureAdmin();
  await connectMongo();

  const { username, email, role, password, forcePasswordChange } = data as {
    username: string;
    email?: string;
    role: string;
    password?: string;
    forcePasswordChange: boolean;
  };

  if (!username) return { error: "Username is required." };
  
  const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } });
  if (existingUser) return { error: "Username already exists." };

  if (email) {
    const existingEmail = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } });
    if (existingEmail) return { error: "Email already exists." };
  }

  let passwordHash = undefined;
  if (password) {
    if (password.length < MIN_PASSWORD_LENGTH) return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    passwordHash = await bcrypt.hash(password, 10);
  }

  const newUser = await User.create({
    username,
    email: email?.toLowerCase() || undefined,
    emailTrusted: Boolean(email),
    role: role || "user",
    passwordHash,
    forcePasswordChange: !!forcePasswordChange,
    isActive: true,
  });

  await AuditLog.create({
    actorId: adminId,
    targetType: "user",
    targetId: String(newUser._id),
    action: "user_create",
    after: { username, email, role },
    note: `Admin created new user ${username}`
  });

  revalidatePath("/admin/users");
  return { success: true };
}
