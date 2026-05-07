import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { appendOrderItem } from "@/lib/pantry-db";
import type { AddOrderItemRequest } from "@/lib/pantry-types";

export async function POST(req: Request, context: { params: Promise<{ publicId: string }> }) {
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

  const itemName = String(body.itemName ?? "").trim();
  const quantityLabel = String(body.quantityLabel ?? "").trim();
  const { publicId } = await context.params;

  try {
    const item = await appendOrderItem(publicId, (session.user as any).id, itemName, quantityLabel);
    return NextResponse.json({ item });
  } catch (error) {
    const code = (error as any)?.code;
    if (code === "ITEM_NAME_TOO_SHORT" || code === "QUANTITY_LABEL_TOO_SHORT") {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    if ((error as Error).message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to add item" }, { status: 500 });
  }
}
