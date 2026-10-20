import { auth } from "@/auth";
import { Order, AuditLog } from "@/models";
import { connectMongo } from "@/lib/db/mongodb";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const publicId = formData.get("publicId") as string;
    const paidInCash = formData.get("paymentMethod") === "cash";
    // Cash payments carry no receipt
    const receiptUrl = paidInCash ? null : (formData.get("receiptUrl") as string);
    const receiptFile = paidInCash ? null : (formData.get("receipt") as File | null);

    if (!publicId) {
      return NextResponse.json({ error: "Public ID is required" }, { status: 400 });
    }

    await connectMongo();

    const order = await Order.findOne({ publicId }).populate("items.productId");
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user is the author
    if (String(order.authorId) !== String((session.user as Record<string, unknown>).id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let finalReceiptUrl = receiptUrl || null;

    // Handle file upload
    if (receiptFile) {
      const bytes = await receiptFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create a unique filename
      const ext = receiptFile.name.split(".").pop() || "jpg";
      const filename = `receipt-${publicId}-${Date.now()}.${ext}`;
      const dir = join(process.cwd(), "storage", "receipts");
      const path = join(dir, filename);

      await mkdir(dir, { recursive: true });
      await writeFile(path, buffer);
      
      // We will serve this through a new route /api/receipts/[filename]
      finalReceiptUrl = `/api/receipts/${filename}`;
    }

    // Freeze item prices and calculate order totals
    let orderSubtotal = 0;
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const populatedProduct = item.productId as Record<string, unknown> | null;
        const productPrice = populatedProduct && typeof populatedProduct === "object" && typeof populatedProduct.price === "number"
          ? populatedProduct.price
          : null;
        
        const unitPrice = productPrice !== null ? productPrice : (typeof item.unitPrice === "number" ? item.unitPrice : 0);
        const quantity = typeof item.quantity === "number" ? item.quantity : 1;
        const lineTotal = unitPrice * quantity;

        item.unitPrice = unitPrice;
        item.lineTotal = lineTotal;
        orderSubtotal += lineTotal;
      }
    }

    // Update order
    order.status = "archived";
    order.archivedAt = new Date();
    order.subtotal = orderSubtotal;
    order.total = orderSubtotal;
    if (finalReceiptUrl) {
      order.receiptUrl = finalReceiptUrl;
    }
    order.paymentMethod = paidInCash ? "cash" : finalReceiptUrl ? "receipt" : null;

    await order.save();

    // Log the action
    await AuditLog.create({
      actorId: (session.user as Record<string, unknown>).id as string,
      targetType: "order",
      targetId: publicId,
      action: "order_archive",
      note: `Archived order${paidInCash ? " paid in cash" : finalReceiptUrl ? " with receipt" : ""}`,
    });

    revalidatePath("/");
    revalidatePath(`/order-list/${publicId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Archive error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
