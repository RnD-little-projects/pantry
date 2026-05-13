import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/db/mongodb";
import { Order } from "@/models";

export async function POST(request: Request) {
  const { publicId, isPublic } = (await request.json()) as { publicId?: string; isPublic?: boolean };

  if (!publicId) {
    return NextResponse.json({ message: "Missing publicId" }, { status: 400 });
  }

  await connectMongo();
  const order = await Order.findOneAndUpdate(
    { publicId },
    { $set: { isPublic: !!isPublic } },
    { new: true },
  ).lean();

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, publicId: order.publicId, isPublic: true });
}

