import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { errorResponse } from "@/lib/api-errors";
import { updateOrderItemQuantity } from "@/lib/pantry-db";
import type { AddOrderItemRequest } from "@/lib/pantry-types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AddOrderItemRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const publicId = String(body.publicId ?? "").trim();
  const quantityLabel = String(body.quantityLabel ?? "").trim();
  const itemIndex = Number(body.itemIndex ?? -1);
  const itemName = String(body.itemName ?? "");

  if (!publicId || itemIndex < 0 || Number.isNaN(itemIndex)) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  try {
    const item = await updateOrderItemQuantity(publicId, (session.user as Record<string, unknown>).id as string, itemIndex, itemName, quantityLabel);
    return NextResponse.json({ item });
  } catch (error) {
    return errorResponse(error, "Unable to update item");
  }
}
