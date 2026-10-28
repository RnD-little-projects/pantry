"use server";

import { adminUpdateProduct, adminDeleteProduct, adminMergeProducts } from "@/lib/pantry-db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// Same roles the /admin/products page lets in.
async function ensureStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "cashier") {
    throw new Error("Unauthorized");
  }
  return session?.user?.id as string | undefined;
}

export async function saveProductAction(data: Record<string, unknown>) {
  try {
    const adminUserId = await ensureStaff();
    const { id, ...rest } = data;
    await adminUpdateProduct((id as string | null) || null, rest, adminUserId);
    revalidatePath("/admin/products");
    revalidatePath("/market-list");
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteProductAction(id: string) {
  try {
    const adminUserId = await ensureStaff();
    await adminDeleteProduct(id, adminUserId);
    revalidatePath("/admin/products");
    revalidatePath("/market-list");
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}

export async function mergeProductsAction(sourceId: string, targetId: string) {
  try {
    const adminUserId = await ensureStaff();
    await adminMergeProducts(sourceId, targetId, adminUserId);
    revalidatePath("/admin/products");
    revalidatePath("/market-list");
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}
