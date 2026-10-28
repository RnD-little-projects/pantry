import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { errorResponse } from "@/lib/api-errors";
import { undoRemoveOrderItem } from "@/lib/pantry-db";

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

  const { publicId, auditLogId } = body;

  if (!publicId || !auditLogId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await undoRemoveOrderItem(publicId, (session.user as Record<string, unknown>).id as string, auditLogId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Unable to undo action");
  }
}
