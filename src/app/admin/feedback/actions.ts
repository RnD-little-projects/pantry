"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectMongo } from "@/lib/db/mongodb";
import { Feedback } from "@/models";

// Feedback is admin-only: cashiers can't read or change it
export async function setFeedbackStatusAction(id: string, status: "new" | "read" | "archived") {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") throw new Error("Unauthorized");
    if (!isValidObjectId(id) || !["new", "read", "archived"].includes(status)) throw new Error("Bad input");

    await connectMongo();
    await Feedback.updateOne({ _id: id }, { $set: { status } });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}
