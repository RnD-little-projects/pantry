"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveProductAction, deleteProductAction, saveCategoryAction } from "./actions";

type Product = {
  id: string;
  name: string;
  price: number | null;
  unit: string;
  notes: string;
  categoryId: string | null;
  categoryName: string;
};

type Category = {
  id: string;
  name: string;
};

export function ProductManager({ 
  initialProducts, 
  initialCategories 
}: { 
  initialProducts: Product[]; 
  initialCategories: Category[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name) return;

    setIsSaving(true);
    try {
      const result = await saveProductAction(editingProduct);
      if (result.success) {
        // Refresh products list (simplified)
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to save product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteProductAction(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName) return;
    try {
      const result = await saveCategoryAction(newCategoryName);
      if (result.success) {
        setCategories([...categories, { id: result.id, name: newCategoryName }]);
        setNewCategoryName("");
      }
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const categoriesWithProducts = categories.map(cat => ({
    ...cat,
    products: products.filter(p => p.categoryId === cat.id)
  }));

  const uncategorizedProducts = products.filter(p => !p.categoryId);

  return (
    <div className="space-y-8">
      {/* Category Management */}
      <Card className="border-border/60 bg-background/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <input 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New Category Name"
              className="flex-1 bg-transparent border-b border-border/60 text-sm focus:outline-none focus:border-primary px-2"
            />
            <Button onClick={handleSaveCategory} size="sm">Add Category</Button>
          </div>
        </CardContent>
      </Card>

      {/* Product List Organized by Category */}
      <div className="space-y-6">
        {[...categoriesWithProducts, { id: null, name: "Uncategorized", products: uncategorizedProducts }].map((group) => (
          <div key={group.id || "uncategorized"} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {group.name}
            </h3>
            
            <Card className="overflow-hidden border-border/60 bg-background/50 backdrop-blur-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                        No products in this category.
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>₱{product.price ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{product.unit || "—"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingProduct(product)}
                            className="h-8 w-8 p-0"
                          >
                            ✎
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Add Product Row */}
                  <TableRow className="bg-primary/5">
                    <TableCell colSpan={4} className="p-0">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start h-10 px-4 text-xs text-primary hover:bg-primary/10 rounded-none"
                        onClick={() => setEditingProduct({ categoryId: group.id || undefined })}
                      >
                        + Add product to {group.name}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        ))}
      </div>

      {/* Edit Product Modal/Overlay */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-slate-950/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-border/70 bg-card shadow-2xl">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold">{editingProduct.id ? 'Edit' : 'Add'} Product</h3>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
                  <input 
                    required
                    value={editingProduct.name || ""}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price (₱)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingProduct.price ?? ""}
                      onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value ? parseFloat(e.target.value) : null})}
                      className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</label>
                    <input 
                      placeholder="pc, kg, etc."
                      value={editingProduct.unit || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})}
                      className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                  <select 
                    value={editingProduct.categoryId || ""}
                    onChange={(e) => setEditingProduct({...editingProduct, categoryId: e.target.value || null})}
                    className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" type="button" onClick={() => setEditingProduct(null)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Product"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
