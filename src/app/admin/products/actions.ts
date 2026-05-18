"use server";

import { adminUpdateProduct, adminDeleteProduct, adminUpsertCategory, adminMergeProducts } from "@/lib/pantry-db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

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
    const session = await auth();
    const adminUserId = session?.user?.id;
    await adminDeleteProduct(id, adminUserId);
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

export async function updateProductCategoryAction(productId: string, categoryId: string | null) {
  try {
    await adminUpdateProduct(productId, { categoryId });
    revalidatePath("/admin/products");
    revalidatePath("/market-list");
    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: String(error) };
  }
}
