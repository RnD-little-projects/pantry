"use server";

import { auth } from "@/auth";
import { createNewOrder } from "@/lib/pantry-db";
import { redirect } from "next/navigation";

// Returns expected errors so the form can show them; a thrown one would land on the error page
export async function startOrderAction(_prev: { error?: string } | null, formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { error: "Your session expired. Sign in again." };
  }

  const itemName = formData.get("itemName") as string;
  const quantityLabel = formData.get("quantity") as string;

  if (!itemName || !quantityLabel) {
    return { error: "Enter an item and a quantity." };
  }

  let publicId: string;
  try {
    publicId = await createNewOrder(userId, itemName, quantityLabel);
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    const message = (error as Error).message;
    if (code === "ITEM_NAME_TOO_SHORT" || code === "QUANTITY_LABEL_TOO_SHORT" || message.startsWith("You already have an active order")) {
      return { error: message };
    }
    console.error("Unable to start order", error);
    return { error: "Couldn't start your list. Try again." };
  }

  redirect(`/order-list/${publicId}`);
}
