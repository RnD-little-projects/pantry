"use server";

import { connectMongo } from "@/lib/db/mongodb";
import { User } from "@/models";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  await connectMongo();
  const passwordHash = await bcrypt.hash(password, 10);
  
  await User.findByIdAndUpdate(session.user.id, {
    passwordHash,
    forcePasswordChange: false
  });

  const { unstable_update } = await import("@/auth");
  await unstable_update({ user: { forcePasswordChange: false } });

  return { success: true };
}

export async function logoutAction() {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") || "https";
  if (host) {
    process.env.AUTH_URL = `${proto}://${host}/api/auth`;
  }
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/login" });
}

export async function attachGoogleAction() {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") || "https";
  if (host) {
    process.env.AUTH_URL = `${proto}://${host}/api/auth`;
  }
  const { signIn } = await import("@/auth");
  await signIn("google", { redirectTo: "/" });
}

export async function changeOwnPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  await connectMongo();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  await User.findByIdAndUpdate(session.user.id, {
    passwordHash
  });

  return { success: true };
}
