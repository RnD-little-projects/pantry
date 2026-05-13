"use server";

import { adminUpdateProduct, adminDeleteProduct, adminUpsertCategory, adminMergeProducts } from "@/lib/pantry-db";
import { revalidatePath } from "next/cache";

export async function saveProductAction(data: Record<string, unknown>) {
  try {
    const { id, ...rest } = data;
    await adminUpdateProduct((id as string | null) || null, rest);
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
    await adminDeleteProduct(id);
    revalidatePath("/admin/products");
    revalidatePath("/market-list");
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}

export async function saveCategoryAction(name: string) {
  try {
    const category = await adminUpsertCategory(name);
    revalidatePath("/admin/products");
    return { success: true, id: String(category._id) };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}

export async function mergeProductsAction(sourceId: string, targetId: string) {
  try {
    await adminMergeProducts(sourceId, targetId);
    revalidatePath("/admin/products");
    revalidatePath("/market-list");
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}
