import { AuditLog, Order, Product, User, Category } from "@/models";
import fs from "fs";
import path from "path";

import { connectMongo } from "./db/mongodb";
import type { MarketItem, OrderHistoryEntry, SharedOrderView, WorkspaceSession } from "./pantry-types";

type LeanOrderItem = {
  _id?: unknown;
  itemName?: string | null;
  quantity?: number | null;
  quantityLabel?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  status?: "draft" | "priced" | "finalized" | null;
};

type LeanOrder = {
  _id?: unknown;
  publicId: string;
  authorId?: unknown;
  title?: string | null;
  items?: LeanOrderItem[] | null;
  status?: "draft" | "finalized" | "paid" | "unpaid" | "archived" | null;
  updatedAt?: Date | string | number | null;
  createdAt?: Date | string | number | null;
  subtotal?: number | null;
  total?: number | null;
  isPublic?: boolean | null;
};

// LeanProduct used implicitly via lean() queries

// LeanAuditLog used implicitly via lean() queries

function formatPeso(amount: number | null) {
  if (amount === null || Number.isNaN(amount)) {
    return "Pending";
  }

  return `₱${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

function formatRelativeDate(value: Date | string | number | null | undefined) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const deltaMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const absMinutes = Math.abs(deltaMinutes);

  if (absMinutes < 60) {
    return deltaMinutes >= 0 ? "Just now" : `${absMinutes}m ago`;
  }

  const hours = Math.round(absMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

async function syncBackupToFile(publicId: string, userId: string) {
  const ready = await canUseMongo();
  if (!ready) return;

  try {
    const user = await User.findById(userId, { username: 1 }).lean();
    if (!user) return;

    const order = await Order.findOne({ publicId, authorId: userId }).lean();
    if (!order) return;

    const username = String(user.username || "unknown").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const orderTitle = String(order.title || order.publicId).replace(/[^a-z0-9]/gi, "-").toLowerCase();
    
    const inventory: Record<string, number> = {};
    if (Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const name = item.itemName || "Unnamed Item";
        const qty = typeof item.quantity === "number" ? item.quantity : 0;
        inventory[name] = (inventory[name] || 0) + qty;
      });
    }

    const lines = Object.entries(inventory)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, qty]) => `${name}: ${qty}`);

    const content = lines.join("\n");
    const userDir = path.join(process.cwd(), "storage", username);
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    const filePath = path.join(userDir, `${orderTitle}-${publicId}.txt`);
    fs.writeFileSync(filePath, content, "utf8");
  } catch (error) {
    console.error("Backup failed:", error);
  }
}

async function canUseMongo() {
  if (!process.env.MONGODB_URI) {
    return false;
  }

  try {
    await connectMongo();
    return true;
  } catch {
    return false;
  }
}

export async function getOverviewSessions(userId?: string): Promise<WorkspaceSession[]> {
  const ready = await canUseMongo();
  if (!ready) {
    return [];
  }

  const query = userId 
    ? { authorId: userId }
    : { isPublic: true };

  const orders = await Order.find(query, { publicId: 1, title: 1, items: 1, status: 1, updatedAt: 1, createdAt: 1, isPublic: 1 })
    .sort({ updatedAt: -1 })
    .limit(6)
    .lean();

  return orders.map((order: LeanOrder, index: number) => ({
    id: String(order._id ?? order.publicId ?? index),
    publicId: order.publicId,
    title: order.title || `Order ${order.publicId}`,
    preview: order.status === "draft" ? "Draft and shareable" : order.status === "paid" ? "Paid" : "Ready for checkout",
    items: `${Array.isArray(order.items) ? order.items.length : 0} items`,
    updated: formatRelativeDate(order.updatedAt ?? order.createdAt),
    active: order.status === "draft" || index === 0,
    isPublic: order.isPublic !== false,
    status: order.status || "draft",
  }));
}

export async function getMarketItems(): Promise<MarketItem[]> {
  const ready = await canUseMongo();
  if (!ready) {
    return [];
  }

  const products = await Product.find({ active: true }, { name: 1, price: 1, active: 1, notes: 1, aliases: 1 })
    .sort({ updatedAt: -1 })
    .lean();

  return products.map((product: Record<string, unknown>, index: number) => ({
    id: String(product._id ?? index),
    name: String(product.name ?? ""),
    price: formatPeso(product.price as number | null ?? null),
    status: (product.active as boolean | null) ? (product.price === null ? "Draft" : "Active") : "Archived",
    note: String(product.notes || ((product.active as boolean | null) ? "" : "Archived")),
    aliases: Array.isArray(product.aliases) ? product.aliases.map((a: Record<string, unknown>) => a.value as string) : [],
  }));
}

export async function getMarketItemMetrics() {
  const ready = await canUseMongo();
  if (!ready) {
    return { total: 0, pending: 0, valuated: 0 };
  }

  const products = await Product.find({ active: true }, { price: 1 }).lean();
  
  let valuated = 0;
  let pending = 0;

  for (const product of products) {
    if (typeof product.price === "number" && product.price > 0) {
      valuated++;
    } else {
      pending++;
    }
  }

  return {
    total: products.length,
    pending,
    valuated
  };
}

async function getOrCreateProduct(itemName: string) {
  const cleanItemName = String(itemName ?? "").trim();
  const normalizedItemName = cleanItemName.toLowerCase();

  let matchedProduct = await Product.findOne({
    $or: [
      { normalizedName: normalizedItemName },
      { "aliases.value": normalizedItemName }
    ],
    active: true
  });

  if (!matchedProduct) {
    const existing = await Product.findOne({ normalizedName: normalizedItemName });
    if (existing) {
      existing.active = true;
      await existing.save();
      matchedProduct = existing;
    } else {
      matchedProduct = await Product.create({
        name: cleanItemName,
        normalizedName: normalizedItemName,
        active: true
      });
    }
  }

  return matchedProduct;
}

export async function getSharedOrder(publicId: string, userId?: string): Promise<SharedOrderView> {
  const ready = await canUseMongo();
  if (!ready) {
    throw new Error("DATABASE_NOT_READY");
  }

  const order = (await Order.findOne({ publicId }).populate("items.productId").lean()) as Record<string, unknown> | null;
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const orderAuthorId = order.authorId ? String(order.authorId) : null;
  const isAuthor = !!(userId && orderAuthorId && orderAuthorId === String(userId));
  
  if (order.isPublic !== true && !isAuthor) {
    throw new Error("ORDER_NOT_PUBLIC");
  }

  const orderItems = order.items as Record<string, unknown>[] | null;
  const items = Array.isArray(orderItems)
    ? orderItems.map((item: Record<string, unknown>, index: number) => {
        const quantityLabel = item.quantityLabel ?? `${item.quantity ?? 0}${item.unit ? ` ${item.unit}` : ""}`.trim();
        
        // Use the latest product price if available, fallback to stored unitPrice
        const populatedProduct = item.productId as Record<string, unknown> | null;
        const productPrice = populatedProduct && typeof populatedProduct === "object" && typeof populatedProduct.price === "number" ? populatedProduct.price : null;
        const unitPrice = productPrice !== null ? productPrice : (typeof item.unitPrice === "number" ? item.unitPrice : null);
        
        const quantity = typeof item.quantity === "number" ? item.quantity : 1;
        const lineTotal = unitPrice !== null ? unitPrice * quantity : 0;

        return {
          id: String(item._id ?? index),
          itemName: (item.itemName as string) || "Unnamed item",
          quantityLabel: quantityLabel as string,
          unitPrice,
          lineTotal,
          status: (item.status as "draft" | "priced" | "finalized") ?? "draft",
        };
      })
    : [];

  const subtotal = items.reduce((sum: number, item: { lineTotal: number }) => sum + item.lineTotal, 0);
  const total = typeof order.total === "number" && order.status !== "draft" ? order.total : subtotal;

  return {
    publicId: order.publicId as string,
    title: (order.title as string | null) || `Order ${order.publicId as string}`,
    createdAtLabel: formatRelativeDate(order.createdAt as Date | string | number),
    updatedAtLabel: formatRelativeDate(order.updatedAt as Date | string | number),
    archivedAtLabel: order.archivedAt ? formatRelativeDate(order.archivedAt as Date | string | number) : null,
    items,
    subtotal,
    total,
    receiptUrl: (order.receiptUrl as string) || null,
    isPublic: order.isPublic !== false,
    status: (order.status as "draft" | "finalized" | "paid" | "unpaid" | "archived") ?? "draft",
    isAuthor,
  };
}

export async function appendOrderItem(publicId: string, userId: string, itemName: string, quantityLabel: string) {
  const ready = await canUseMongo();
  if (!ready) {
    throw new Error("DATABASE_NOT_READY");
  }

  const cleanItemName = String(itemName ?? "").trim();
  const cleanQuantityLabel = String(quantityLabel ?? "").trim();

  if (cleanItemName.length < 2) {
    const error = new Error("Item name must be at least 2 characters");
    (error as Error & { code?: string }).code = "ITEM_NAME_TOO_SHORT";
    throw error;
  }

  if (cleanQuantityLabel.length < 1) {
    const error = new Error("Quantity label is required");
    (error as Error & { code?: string }).code = "QUANTITY_LABEL_TOO_SHORT";
    throw error;
  }

  const order = await Order.findOne({ publicId });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (!order.authorId || String(order.authorId) !== String(userId)) {
    const error = new Error("Forbidden");
    (error as Error & { code?: string }).code = "FORBIDDEN";
    throw error;
  }

  const parsedQuantity = parseInt(cleanQuantityLabel, 10);
  const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

  const matchedProduct = await getOrCreateProduct(cleanItemName);

  const item = {
    productId: matchedProduct._id,
    itemName: matchedProduct.name,
    normalizedItemName: matchedProduct.normalizedName,
    quantity,
    quantityLabel: cleanQuantityLabel,
    unit: matchedProduct.unit || "",
    unitPrice: matchedProduct.price,
    lineTotal: typeof matchedProduct.price === "number" ? matchedProduct.price * quantity : 0,
    status: typeof matchedProduct.price === "number" ? "priced" as const : "draft" as const,
  };

  order.items.push(item);
  order.markModified("items");
  await order.save();

  await AuditLog.create({
    actorId: userId,
    targetType: "order",
    targetId: publicId,
    action: "item_add",
    after: {
      itemName: matchedProduct.name,
      quantityLabel: item.quantityLabel,
    },
    note: `Added ${matchedProduct.name}`,
  });

  const inserted = order.items[order.items.length - 1];
  const result = {
    id: String(inserted._id ?? order.items.length - 1),
    itemName: inserted.itemName,
    quantityLabel: inserted.quantityLabel,
    unitPrice: inserted.unitPrice ?? null,
    lineTotal: inserted.lineTotal ?? 0,
    status: inserted.status ?? "draft",
  };

  await syncBackupToFile(publicId, userId);
  return result;
}

export async function updateOrderItemQuantity(publicId: string, userId: string, itemIndex: number, quantityLabel: string) {
  const ready = await canUseMongo();
  if (!ready) {
    throw new Error("DATABASE_NOT_READY");
  }

  const cleanQuantityLabel = String(quantityLabel ?? "").trim();
  if (cleanQuantityLabel.length < 1) {
    const error = new Error("Quantity label is required");
    (error as Error & { code?: string }).code = "QUANTITY_LABEL_TOO_SHORT";
    throw error;
  }

  const order = await Order.findOne({ publicId });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (!order.authorId || String(order.authorId) !== String(userId)) {
    const error = new Error("Forbidden");
    (error as Error & { code?: string }).code = "FORBIDDEN";
    throw error;
  }

  if (!Array.isArray(order.items) || itemIndex < 0 || itemIndex >= order.items.length) {
    const error = new Error("ITEM_NOT_FOUND");
    (error as Error & { code?: string }).code = "ITEM_NOT_FOUND";
    throw error;
  }

  const item = order.items[itemIndex] as Record<string, unknown>;
  const oldQuantityLabel = String(item.quantityLabel ?? "").trim();
  item.quantityLabel = cleanQuantityLabel;

  const parsedQuantity = parseInt(cleanQuantityLabel, 10);
  if (Number.isFinite(parsedQuantity) && parsedQuantity > 0) {
    item.quantity = parsedQuantity;
  }

  order.markModified("items");
  await order.save();

  await AuditLog.create({
    actorId: userId,
    targetType: "order",
    targetId: publicId,
    action: "quantity_update",
    before: {
      itemName: item.itemName,
      quantityLabel: oldQuantityLabel,
    },
    after: {
      itemName: item.itemName,
      quantityLabel: item.quantityLabel,
    },
    note: `Updated quantity for ${item.itemName}`,
  });

  const result = {
    id: String(item._id ?? itemIndex),
    itemName: item.itemName,
    quantityLabel: item.quantityLabel,
    unitPrice: item.unitPrice ?? null,
    lineTotal: item.lineTotal ?? 0,
    status: item.status ?? "draft",
  };

  await syncBackupToFile(publicId, userId);
  return result;
}

export async function removeOrderItem(publicId: string, userId: string, itemIndex: number) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("DATABASE_NOT_READY");

  const order = await Order.findOne({ publicId });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  if (!order.authorId || String(order.authorId) !== String(userId)) {
    const error = new Error("Forbidden");
    (error as Error & { code?: string }).code = "FORBIDDEN";
    throw error;
  }

  if (!Array.isArray(order.items) || itemIndex < 0 || itemIndex >= order.items.length) {
    const error = new Error("ITEM_NOT_FOUND");
    (error as Error & { code?: string }).code = "ITEM_NOT_FOUND";
    throw error;
  }

  const removedItem = order.items[itemIndex];
  order.items.splice(itemIndex, 1);
  order.markModified("items");
  await order.save();

  await AuditLog.create({
    actorId: userId,
    targetType: "order",
    targetId: publicId,
    action: "item_remove",
    before: {
      itemName: removedItem.itemName,
      quantityLabel: removedItem.quantityLabel,
      // Store full item data to allow undo
      fullItem: removedItem, 
      index: itemIndex
    },
    note: `Removed ${removedItem.itemName}`,
  });

  await syncBackupToFile(publicId, userId);
  return true;
}

export async function undoRemoveOrderItem(publicId: string, userId: string, auditLogId: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("DATABASE_NOT_READY");

  const auditLog = await AuditLog.findById(auditLogId);
  if (!auditLog || auditLog.action !== "item_remove" || String(auditLog.targetId) !== publicId) {
    throw new Error("INVALID_AUDIT_LOG");
  }

  const order = await Order.findOne({ publicId });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const user = await User.findById(userId).lean();
  const isAdmin = user?.role === "admin";

  if (!isAdmin && (!order.authorId || String(order.authorId) !== String(userId))) {
    throw new Error("FORBIDDEN");
  }

  const { fullItem, index } = auditLog.before as { fullItem: Record<string, unknown>; index: number };
  
  // Re-insert the item at the original index
  order.items.splice(index, 0, fullItem);
  order.markModified("items");
  await order.save();

  await AuditLog.create({
    actorId: userId,
    targetType: "order",
    targetId: publicId,
    action: "item_undo_remove",
    after: {
      itemName: fullItem.itemName,
      quantityLabel: fullItem.quantityLabel,
    },
    note: `Undid removal of ${fullItem.itemName}`,
  });

  // Delete the item_remove log to prevent multiple undos
  await AuditLog.findByIdAndDelete(auditLogId);

  await syncBackupToFile(publicId, userId);
  return true;
}

export async function getOrderHistory(publicId: string): Promise<OrderHistoryEntry[]> {
  const ready = await canUseMongo();
  if (!ready) {
    return [];
  }

  const auditLogs = await import("@/models").then(({ AuditLog }) =>
    AuditLog.find({ targetType: "order", targetId: publicId }, { action: 1, note: 1, createdAt: 1, after: 1, before: 1 })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
  );

  if (!auditLogs.length) {
    return [];
  }

  return auditLogs.map((entry: Record<string, unknown>) => {
    const after = (entry.after ?? {}) as Record<string, unknown>;
    const before = (entry.before ?? {}) as Record<string, unknown>;
    return {
      id: String(entry._id),
      date: new Date((entry.createdAt as string | number | Date) ?? Date.now()).toISOString().slice(0, 10),
      item: String(after.itemName || before.itemName || after.productName || entry.note || "Order update"),
      quantity: String(after.quantityLabel || before.quantityLabel || after.quantity || "-"),
      action: String(entry.action).replace(/_/g, " ").replace(/\b\w/g, (char: string) => char.toUpperCase()),
      rawAction: String(entry.action),
      isAdminRemove: before.isAdminRemove === true,
    };
  });
}

export async function getLatestOrderPublicId(userId?: string): Promise<string | null> {
  const ready = await canUseMongo();
  if (!ready) {
    return null;
  }

  const query = userId ? { authorId: userId } : { isPublic: true };

  const latestOrder = await Order.findOne(query, { publicId: 1 })
    .sort({ updatedAt: -1 })
    .lean();

  if (!latestOrder && userId) {
    return null;
  }

  return latestOrder?.publicId || null;
}

export async function createNewOrder(userId: string, itemName: string, quantityLabel: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  // Generate a simple unique publicId
  const publicId = Math.random().toString(36).substring(2, 12);
  
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const parsedQuantity = parseInt(quantityLabel, 10);
  const matchedProduct = await getOrCreateProduct(itemName);
  const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

  const newOrder = new Order({
    publicId,
    authorId: userId,
    title: dateStr,
    isPublic: true,
    status: "draft",
    items: [
      {
        productId: matchedProduct._id,
        itemName: matchedProduct.name,
        normalizedItemName: matchedProduct.normalizedName,
        quantity,
        quantityLabel,
        unit: matchedProduct.unit || "",
        unitPrice: matchedProduct.price,
        lineTotal: typeof matchedProduct.price === "number" ? matchedProduct.price * quantity : 0,
        status: typeof matchedProduct.price === "number" ? "priced" as const : "draft" as const,
      },
    ],
  });

  await newOrder.save();

  // Log the first item in history
  await AuditLog.create({
    actorId: userId,
    targetType: "order",
    targetId: publicId,
    action: "item_add",
    after: {
      itemName: matchedProduct.name,
      quantityLabel,
    },
    note: `Added ${matchedProduct.name}`,
  });

  await syncBackupToFile(publicId, userId);
  return publicId;
}
export async function getAllUsersWithOrderCounts() {
  const ready = await canUseMongo();
  if (!ready) return [];

  const users = await User.find({}, { username: 1, email: 1, avatarUrl: 1, role: 1 }).lean();
  
  const userList = await Promise.all(users.map(async (user: Record<string, unknown>) => {
    const orderCount = await Order.countDocuments({ authorId: user._id });
    return {
      id: String(user._id),
      username: String(user.username ?? ""),
      email: (user.email as string | null) ?? null,
      avatarUrl: (user.avatarUrl as string | null) ?? null,
      role: String(user.role ?? "user"),
      orderCount
    };
  }));

  return userList;
}

export async function getOrdersByUser(userId: string): Promise<WorkspaceSession[]> {
  const ready = await canUseMongo();
  if (!ready) return [];

  const orders = await Order.find({ authorId: userId })
    .sort({ updatedAt: -1 })
    .lean();

  return orders.map((order: Record<string, unknown>) => ({
    id: String(order._id),
    publicId: order.publicId as string | undefined,
    title: (order.title as string | null) || `Order ${order.publicId as string}`,
    preview: order.status === "draft" ? "Draft" : order.status === "paid" ? "Paid" : "Ready",
    items: `${Array.isArray(order.items) ? order.items.length : 0} items`,
    updated: formatRelativeDate((order.updatedAt ?? order.createdAt) as string | number | Date),
    active: false,
    isPublic: order.isPublic !== false,
    status: (order.status as string) || "draft",
  }));
}

export async function getCategories() {
  const ready = await canUseMongo();
  if (!ready) return [];
  return Category.find({ active: true }).sort({ name: 1 }).lean();
}

export async function adminUpsertCategory(name: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return Category.findOneAndUpdate(
    { slug },
    { name, slug, active: true },
    { upsert: true, new: true }
  );
}

export async function adminUpdateProduct(productId: string | null, data: Record<string, unknown>) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const updateData: Record<string, any> = {
    ...data,
    active: true
  };

  if (typeof data.name === "string") {
    updateData.normalizedName = data.name.toLowerCase();
  }

  // Convert comma-separated aliases to the schema format if it's a string
  if (typeof data.aliases === "string") {
    updateData.aliases = data.aliases
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => s.length > 0)
      .map((value: string) => ({ value, source: "manual" }));
  }

  if (productId) {
    const product = await Product.findByIdAndUpdate(productId, updateData, { new: true });
    
    // Sync price to draft orders if price was updated
    if (data.price !== undefined) {
      await Order.updateMany(
        { "items.productId": productId, status: "draft" },
        { 
          $set: { 
            "items.$[elem].unitPrice": data.price,
            "items.$[elem].status": data.price !== null ? "priced" : "draft"
          } 
        },
        { arrayFilters: [{ "elem.productId": productId }] }
      );
    }
    
    return product;
  } else {
    return Product.create(updateData);
  }
}

export async function adminMergeProducts(sourceId: string, targetId: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const source = await Product.findById(sourceId);
  const target = await Product.findById(targetId);

  if (!source || !target) throw new Error("Product not found");
  if (String(source._id) === String(target._id)) throw new Error("Cannot merge into itself");

  // Collect all unique alias values
  const aliasValues = new Set<string>();
  
  // Add source name as alias
  aliasValues.add(source.normalizedName);
  
  // Add source's existing aliases
  if (Array.isArray(source.aliases)) {
    source.aliases.forEach((a: Record<string, unknown>) => aliasValues.add(a.value as string));
  }
  
  // Add target's existing aliases
  if (Array.isArray(target.aliases)) {
    target.aliases.forEach((a: Record<string, unknown>) => aliasValues.add(a.value as string));
  }

  // Build new aliases array for target, excluding target's own name
  const finalAliases = Array.from(aliasValues)
    .filter(val => val !== target.normalizedName)
    .map(value => ({ value, source: "merge" }));

  target.aliases = finalAliases;
  await target.save();

  // Update all orders pointing to source to point to target
  await Order.updateMany(
    { "items.productId": source._id },
    { 
      $set: { 
        "items.$[elem].productId": target._id,
        "items.$[elem].itemName": target.name
      } 
    },
    { arrayFilters: [{ "elem.productId": source._id }] }
  );

  // Deactivate source
  source.active = false;
  await source.save();

  // Refresh backups for all affected orders
  const affectedOrders = await Order.find({ "items.productId": target._id }).lean();
  for (const order of affectedOrders) {
    if (order.publicId && order.authorId) {
      await syncBackupToFile(order.publicId, String(order.authorId));
    }
  }

  return true;
}

export async function adminDeleteProduct(productId: string, adminUserId?: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const product = await Product.findByIdAndUpdate(productId, { active: false });
  if (!product) return null;

  // Remove this product from all orders that have it
  const affectedOrders = await Order.find({ "items.productId": productId });
  for (const order of affectedOrders) {
    const originalItems = order.items || [];
    let modified = false;
    const remainingItems = [];

    for (let i = 0; i < originalItems.length; i++) {
      const item = originalItems[i];
      if (String(item.productId) === String(productId)) {
        modified = true;
        if (adminUserId) {
          await AuditLog.create({
            actorId: adminUserId,
            targetType: "order",
            targetId: order.publicId,
            action: "item_remove",
            before: {
              itemName: item.itemName,
              quantityLabel: item.quantityLabel,
              fullItem: item,
              index: i,
              isAdminRemove: true
            },
            note: `Admin removed deleted product: ${item.itemName}`,
          });
        }
      } else {
        remainingItems.push(item);
      }
    }

    if (modified) {
      order.items = remainingItems;
      order.markModified("items");
      await order.save();
      if (order.publicId && order.authorId) {
        await syncBackupToFile(order.publicId, String(order.authorId));
      }
    }
  }

  return product;
}
