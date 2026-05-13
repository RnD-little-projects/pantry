import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { undoRemoveOrderItem } from "@/lib/pantry-db";

export async function POST(req: Request) {
  let session;
  try {
    session = await auth();
  } catch (error) {
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
    await undoRemoveOrderItem(publicId, (session.user as any).id, auditLogId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Undo-item route error:", error);
    return NextResponse.json({ error: (error as Error).message || "Unable to undo action" }, { status: 500 });
  }
}
