"use server";

import { getOrdersByUser } from "@/lib/pantry-db";
import { auth } from "@/auth";

export async function fetchUserOrdersAction(userId: string) {
  try {
    const role = (await auth())?.user?.role;
    if (role !== "admin" && role !== "cashier") {
      throw new Error("Unauthorized");
    }
    const orders = await getOrdersByUser(userId);
    return { success: true, orders };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}
