import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCategories, getOverviewSessions, getMarketItems } from "@/lib/pantry-db";
import { PantryLayout } from "@/components/pantry-layout";
import { ProductManager } from "./ProductManager";
import { connectMongo } from "@/lib/db/mongodb";
import { Product as ProductModel } from "@/models";

export default async function AdminProductsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin" && role !== "cashier") {
    redirect("/unauthorized");
  }

  await connectMongo();
  const [categories, sessions, marketItems, rawProducts] = await Promise.all([
    getCategories(),
    getOverviewSessions((session.user as Record<string, unknown>).id as string | undefined),
    getMarketItems(),
    ProductModel.find({ active: true }).populate("categoryId").lean(),
  ]);

  const products = rawProducts.map((p: Record<string, unknown>) => ({
    id: String(p._id),
    name: p.name as string,
    price: p.price as number | null,
    notes: p.notes as string,
    categoryId: p.categoryId ? String((p.categoryId as Record<string, unknown>)._id) : null,
    categoryName: p.categoryId ? (p.categoryId as Record<string, unknown>).name as string : "Uncategorized",
    aliases: p.aliases ? (p.aliases as Record<string, unknown>[]).map((a: Record<string, unknown>) => a.value as string).join(", ") : "",
  }));

  return (
    <PantryLayout active="overview" sessions={sessions} marketItems={marketItems} userRole={(session.user as Record<string, unknown>).role as string | undefined} user={session.user as any}>
      <div className="space-y-6">
        <div className="px-1 flex justify-between items-end">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">Products</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage products, categories, and prices.</p>
          </div>
        </div>

        <ProductManager 
          initialProducts={products} 
          initialCategories={categories.map((c: Record<string, unknown>) => ({ id: String(c._id), name: c.name as string }))} 
        />
      </div>
    </PantryLayout>
  );
}
