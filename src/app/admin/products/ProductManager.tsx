"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveProductAction, deleteProductAction, saveCategoryAction, mergeProductsAction, updateProductCategoryAction } from "./actions";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  price: number | null;
  notes: string;
  aliases: string; // Comma-separated string for UI
  categoryId: string | null;
  categoryName: string;
};

type Category = {
  id: string;
  name: string;
};

import { Plus, Merge, Trash2 } from "lucide-react";

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
  const [mergingProduct, setMergingProduct] = useState<Product | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name) return;

    setIsSaving(true);
    try {
      const result = await saveProductAction(editingProduct);
      if (result.success) {
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
      if (result.success && result.id) {
        setCategories([...categories, { id: result.id, name: newCategoryName }]);
        setNewCategoryName("");
      }
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  };

  const handleMergeProducts = async () => {
    if (!mergingProduct || !mergeTargetId) return;
    setIsSaving(true);
    try {
      const result = await mergeProductsAction(mergingProduct.id, mergeTargetId);
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to merge products:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async (categoryId: string | null) => {
    setDragOverCategoryId(null);
    const productId = window.localStorage.getItem("draggingProductId");
    if (!productId) return;
    
    window.localStorage.removeItem("draggingProductId");
    
    try {
      const result = await updateProductCategoryAction(productId, categoryId);
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to move product:", error);
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
      <Card className="border-border/40 bg-card/20 backdrop-blur-md shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <input 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New Category Name"
              className="flex-1 bg-transparent border-b border-border/40 text-sm focus:outline-none focus:border-primary px-2 transition-colors"
            />
            <Button onClick={handleSaveCategory} size="sm" className="rounded-xl px-6">Add Category</Button>
          </div>
        </CardContent>
      </Card>

      {/* Product List Organized by Category - Grid Layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[...categoriesWithProducts, { id: null, name: "Uncategorized", products: uncategorizedProducts }].map((group) => (
          <Card 
            key={group.id || "uncategorized"} 
            className={cn(
              "flex flex-col h-[480px] border-border/40 bg-card/40 backdrop-blur-md shadow-sm transition-all hover:shadow-lg hover:border-border/60",
              dragOverCategoryId === group.id && "border-primary ring-2 ring-primary/20 bg-primary/5"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCategoryId(group.id);
            }}
            onDragLeave={() => setDragOverCategoryId(null)}
            onDrop={() => handleDrop(group.id)}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/20 bg-muted/20">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/80">
                  {group.name}
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted/50 border border-border/40 text-muted-foreground/60">
                  {group.products.length}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => setEditingProduct({ categoryId: group.id || undefined })}
                title={`Add product to ${group.name}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
              {group.products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20 grayscale">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em]">No items</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {group.products.map((product) => (
                    <div 
                      key={product.id} 
                      className="group relative"
                      draggable
                      onDragStart={(e) => {
                        window.localStorage.setItem("draggingProductId", product.id);
                        e.dataTransfer.setData("productId", product.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <div 
                        onClick={() => setEditingProduct(product)}
                        className="flex items-center justify-between rounded-2xl px-3.5 py-2.5 transition-all hover:bg-primary/5 active:bg-primary/10 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex-1 flex items-center gap-3 truncate pr-3">
                          <div className="text-xs font-semibold text-foreground/70 hover:text-primary transition-colors truncate">
                            {product.name}
                          </div>
                          
                          {/* Price Tag (Visible on hover) */}
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 shrink-0">
                            <div className="bg-foreground text-background text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-foreground/10">
                              ₱{product.price ?? "—"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setMergingProduct(product)}
                            className="h-7 w-7 rounded-lg text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500"
                            title="Merge"
                          >
                            <Merge className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="h-7 w-7 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-slate-950/75 p-4 backdrop-blur-sm">
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aliases</label>
                  <input 
                    placeholder="e.g. coke, coca cola (comma separated)"
                    value={editingProduct.aliases || ""}
                    onChange={(e) => setEditingProduct({...editingProduct, aliases: e.target.value})}
                    className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Used for matching similar items during add.</p>
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

      {/* Merge Product Modal */}
      {mergingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-slate-950/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-border/70 bg-card shadow-2xl">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-amber-500 flex items-center gap-2">
                Merge &ldquo;{mergingProduct.name}&rdquo;
              </h3>
              <p className="text-sm text-muted-foreground">
                This will move all aliases and order history from <strong>{mergingProduct.name}</strong> into another product, then deactivate this one.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Merge into...</label>
                  <select 
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select target product</option>
                    {products
                      .filter(p => p.id !== mergingProduct.id)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" type="button" onClick={() => { setMergingProduct(null); setMergeTargetId(""); }}>Cancel</Button>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700 text-white" 
                    onClick={handleMergeProducts} 
                    disabled={isSaving || !mergeTargetId}
                  >
                    {isSaving ? "Merging..." : "Confirm Merge"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
