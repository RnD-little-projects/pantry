import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { errorResponse } from "@/lib/api-errors";
import { removeOrderItem } from "@/lib/pantry-db";

export async function POST(req: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Unable to authenticate request" }, { status: 500 });
  }

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { publicId, itemIndex, itemName } = body;

  if (!publicId || typeof itemIndex !== "number" || typeof itemName !== "string") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await removeOrderItem(publicId, (session.user as Record<string, unknown>).id as string, itemIndex, itemName);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Unable to remove item");
  }
}
