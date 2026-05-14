"use server";

import { auth } from "@/auth";
import { createNewOrder } from "@/lib/pantry-db";
import { redirect } from "next/navigation";

export async function startOrderAction(userId: string, formData: FormData) {
  const session = await auth();
  const actualUserId = session?.user?.id || userId;

  if (!actualUserId) {
    throw new Error("Unauthorized");
  }

  const itemName = formData.get("itemName") as string;
  const quantityLabel = formData.get("quantity") as string;

  if (!itemName || !quantityLabel) {
    throw new Error("Missing item name or quantity");
  }

  const publicId = await createNewOrder(actualUserId as string, itemName, quantityLabel);
  
  redirect(`/order-list/${publicId}`);
}
