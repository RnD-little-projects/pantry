"use server";

import { getOrdersByUser } from "@/lib/pantry-db";

export async function fetchUserOrdersAction(userId: string) {
  try {
    const orders = await getOrdersByUser(userId);
    return { success: true, orders };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}
