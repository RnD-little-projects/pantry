import { auth } from "@/auth";
import { connectMongo } from "@/lib/db/mongodb";
import { Order } from "@/models";
import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await params;
    
    // Security check: ensure the filename doesn't contain path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Only the order's owner and staff may see its receipt
    const publicId = /^receipt-(.+)-\d+\.\w+$/.exec(filename)?.[1];
    const role = session.user.role;
    if (role !== "admin" && role !== "cashier") {
      await connectMongo();
      const order = publicId ? await Order.findOne({ publicId }, { authorId: 1 }).lean() : null;
      if (!order || String(order.authorId) !== String(session.user.id)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    const path = join(process.cwd(), "storage", "receipts", filename);
    
    try {
      const data = await readFile(path);
      
      // Determine content type
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";

      return new Response(data, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
