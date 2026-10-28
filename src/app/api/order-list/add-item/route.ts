import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { errorResponse } from "@/lib/api-errors";
import { appendOrderItem } from "@/lib/pantry-db";
import type { AddOrderItemRequest } from "@/lib/pantry-types";

export async function POST(req: Request) {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("Add-item auth error:", error);
    return NextResponse.json({ error: "Unable to authenticate request" }, { status: 500 });
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
    return errorResponse(error, "Unable to add item");
  }
}
