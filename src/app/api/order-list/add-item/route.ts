import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { appendOrderItem } from "@/lib/pantry-db";
import type { AddOrderItemRequest } from "@/lib/pantry-types";

export async function POST(req: Request) {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("Add-item auth error:", error);
    return NextResponse.json({ error: "Unable to authenticate request", details: (error as Error).message }, { status: 500 });
  }

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
  const itemName = String(body.itemName ?? "").trim();
  const quantityLabel = String(body.quantityLabel ?? "").trim();

  if (!publicId) {
    return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
  }

  try {
    const item = await appendOrderItem(publicId, (session.user as Record<string, unknown>).id as string, itemName, quantityLabel);
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Add-item route error:", error);
    const code = (error as Record<string, unknown>)?.code;
    if (code === "ITEM_NAME_TOO_SHORT" || code === "QUANTITY_LABEL_TOO_SHORT") {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    if (code === "ORDER_LOCKED" || code === "ITEM_CHANGED") {
      return NextResponse.json({ error: (error as Error).message }, { status: 409 });
    }

    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    if ((error as Error).message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ error: (error as Error).message || "Unable to add item", code: code ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
