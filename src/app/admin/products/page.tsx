import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCategories, getOverviewSessions, getMarketItems, Product } from "@/lib/pantry-db";
import { AppShell } from "@/components/app-shell";
import { ProductManager } from "./ProductManager";
import { connectMongo } from "@/lib/db/mongodb";
import { Product as ProductModel } from "@/models";

export default async function AdminProductsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if ((session.user as any).role !== "admin") {
    redirect("/unauthorized");
  }

  await connectMongo();
  const [categories, sessions, marketItems, rawProducts] = await Promise.all([
    getCategories(),
    getOverviewSessions(),
    getMarketItems(),
    ProductModel.find({ active: true }).populate("categoryId").lean(),
  ]);

  const products = rawProducts.map((p: any) => ({
    id: String(p._id),
    name: p.name,
    price: p.price,
    unit: p.unit,
    notes: p.notes,
    categoryId: p.categoryId ? String(p.categoryId._id) : null,
    categoryName: p.categoryId ? p.categoryId.name : "Uncategorized",
  }));

  return (
    <AppShell active="overview" sessions={sessions} marketItems={marketItems} userRole={(session.user as any).role}>
      <div className="space-y-6">
        <div className="px-1 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin: Market Items</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage products, categories, and prices.</p>
          </div>
        </div>

        <ProductManager 
          initialProducts={products} 
          initialCategories={categories.map((c: any) => ({ id: String(c._id), name: c.name }))} 
        />
      </div>
    </AppShell>
  );
}
