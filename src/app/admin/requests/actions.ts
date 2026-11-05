"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectMongo } from "@/lib/db/mongodb";
import { adminUpdateProduct } from "@/lib/pantry-db";
import { ItemRequest, Product } from "@/models";

// Same roles the /admin/requests page lets in.
async function ensureStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "cashier") {
    throw new Error("Unauthorized");
  }
  return session?.user?.id as string | undefined;
}

// Finds the product with this name, or creates it; a removed one is turned back on
async function ensureProduct(name: string, normalizedName: string, staffId?: string) {
  const existing = await Product.findOne({ normalizedName }, { _id: 1, active: 1 }).lean<{ _id: unknown; active: boolean }>();
  if (existing?.active) return existing._id;
  // adminUpdateProduct always sets active, and logs the create/update in the audit log
  const product = await adminUpdateProduct(existing ? String(existing._id) : null, existing ? {} : { name }, staffId);
  if (!product) throw new Error("Product not saved");
  return product._id;
}

// "Available" also puts the item in the product list, so people can add it to their orders
export async function answerRequestAction(id: string, status: "available" | "unavailable", staffNote: string) {
  try {
    const staffId = await ensureStaff();
    if (!isValidObjectId(id)) throw new Error("Bad id");
    if (status !== "available" && status !== "unavailable") throw new Error("Bad status");
    const note = String(staffNote ?? "").trim().slice(0, 300);

    await connectMongo();
    const request = await ItemRequest.findById(id, { name: 1, normalizedName: 1 }).lean<{ name: string; normalizedName: string }>();
    if (!request) throw new Error("Request not found");

    const productId = status === "available" ? await ensureProduct(request.name, request.normalizedName, staffId) : null;
    await ItemRequest.updateOne(
      { _id: id },
      { $set: { status, staffNote: note, productId, handledBy: staffId ?? null, handledAt: new Date() } },
    );
    revalidatePath("/admin/requests");
    if (productId) {
      revalidatePath("/admin/products");
      revalidatePath("/market-list");
    }
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}
