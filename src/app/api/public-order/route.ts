import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectMongo } from "@/lib/db/mongodb";
import { Order } from "@/models";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { publicId?: string; isPublic?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request payload" }, { status: 400 });
  }

  const { publicId, isPublic } = body;
  if (!publicId) {
    return NextResponse.json({ message: "Missing publicId" }, { status: 400 });
  }

  await connectMongo();
  const order = await Order.findOne({ publicId }, { authorId: 1 }).lean();
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  if (String(order.authorId) !== String((session.user as Record<string, unknown>).id)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await Order.updateOne({ publicId }, { $set: { isPublic: !!isPublic } });

  return NextResponse.json({ ok: true, publicId, isPublic: !!isPublic });
}
