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

  revalidatePath("/");
  return { success: true };
}

export async function logoutAction() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/login" });
}
