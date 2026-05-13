import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeOrderItem } from "@/lib/pantry-db";

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

  const { publicId, itemIndex } = body;

  if (!publicId || typeof itemIndex !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await removeOrderItem(publicId, (session.user as any).id, itemIndex);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove-item route error:", error);
    const code = (error as any)?.code;
    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }
    return NextResponse.json({ error: (error as Error).message || "Unable to remove item" }, { status: 500 });
  }
}
