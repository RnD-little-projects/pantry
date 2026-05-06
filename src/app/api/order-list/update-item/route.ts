import { NextResponse } from "next/server";

import { auth } from "@/auth";
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

  if (!publicId || itemIndex < 0 || Number.isNaN(itemIndex)) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  try {
    const item = await updateOrderItemQuantity(publicId, (session.user as any).id, itemIndex, quantityLabel);
    return NextResponse.json({ item });
  } catch (error) {
    const code = (error as any)?.code;
    if (code === "QUANTITY_LABEL_TOO_SHORT") {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    if ((error as Error).message === "ORDER_NOT_FOUND" || (error as Error).message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: (error as Error).message }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to update item" }, { status: 500 });
  }
}
