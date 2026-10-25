"use server";

import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/db/mongodb";
import { User } from "@/models";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/utils";

export async function registerAction(formData: FormData) {
  if (process.env.ALLOW_REGISTRATION === "false") {
    return { error: "Account registration is currently disabled by administrator." };
  }

  try {
    const username = String(formData.get("username") ?? "").trim();
    const emailRaw = String(formData.get("email") ?? "").trim();
    const email = emailRaw ? emailRaw.toLowerCase() : undefined;
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (username.length < 3) {
      return { error: "Username must be at least 3 characters." };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }

    if (password !== confirmPassword) {
      return { error: "Passwords do not match." };
    }

    await connectMongo();

    const existingUser = await User.findOne({
      $or: email ? [{ username }, { email }] : [{ username }],
    })
      .select("_id")
      .lean();

    if (existingUser) {
      return { error: "Username or email is already in use." };
    }

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;
    const allowFirstAdmin = process.env.ALLOW_FIRST_LOGIN_ADMIN === "true";
    const role = isFirstUser && allowFirstAdmin ? "admin" : "user";
    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      username,
      ...(email ? { email } : {}),
      passwordHash,
      provider: "local",
      isActive: true,
      role,
    });

    try {
      await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      return { success: true };
    } catch (signInErr) {
      if (signInErr instanceof AuthError) {
        return { error: "Successfully registered but failed auto sign-in." };
      }
      throw signInErr;
    }
  } catch (error: any) {
    console.error("Registration failed", error);
    return { error: error.message || "Registration failed. Please try again." };
  }
}
