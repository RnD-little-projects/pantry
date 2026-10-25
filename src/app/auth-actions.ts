"use server";

import { connectMongo } from "@/lib/db/mongodb";
import { User } from "@/models";
import { auth, signIn, signOut, unstable_update } from "@/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/utils";
import bcrypt from "bcryptjs";

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  await connectMongo();
  const user = await User.findById(session.user.id).select("passwordHash forcePasswordChange").lean();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // A forced change follows an admin reset, so the user just signed in with the temp password
  if (user.passwordHash && !user.forcePasswordChange && !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new Error("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(session.user.id, {
    passwordHash,
    forcePasswordChange: false
  });

  if (user.forcePasswordChange) {
    await unstable_update({ user: { forcePasswordChange: false } });
  }

  return { success: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function attachGoogleAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function changeEmailAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const newEmail = formData.get("email") as string;
  if (!newEmail || !newEmail.includes("@")) {
    throw new Error("Please enter a valid email address");
  }

  const cleanEmail = newEmail.trim().toLowerCase();

  await connectMongo();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing && existing._id.toString() !== session.user.id) {
    throw new Error("This email is already in use by another account");
  }

  await User.findByIdAndUpdate(session.user.id, {
    email: cleanEmail,
  });

  await unstable_update({ user: { email: cleanEmail } });

  return { success: true, email: cleanEmail };
}
