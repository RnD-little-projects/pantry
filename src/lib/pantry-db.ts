import { AuditLog, Order, Product, User, Category } from "@/models";

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
  authorId?: any;
  title?: string | null;
  items?: LeanOrderItem[] | null;
  status?: "draft" | "finalized" | "paid" | "unpaid" | "archived" | null;
  updatedAt?: Date | string | number | null;
  createdAt?: Date | string | number | null;
  subtotal?: number | null;
  total?: number | null;
  isPublic?: boolean | null;
};

type LeanProduct = {
  _id?: unknown;
  name: string;
  price?: number | null;
  active?: boolean | null;
  notes?: string | null;
};

type LeanAuditLog = {
  createdAt?: Date | string | number | null;
  action: string;
  note?: string | null;
  after?: {
    itemName?: string | null;
    productName?: string | null;
    quantityLabel?: string | null;
    quantity?: string | number | null;
  } | null;
};

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

export async function getOverviewSessions(): Promise<WorkspaceSession[]> {
  const ready = await canUseMongo();
  if (!ready) {
    return [];
  }

  const orders = await Order.find({}, { publicId: 1, title: 1, items: 1, status: 1, updatedAt: 1, createdAt: 1, isPublic: 1 })
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

  return products.map((product: any, index: number) => ({
    id: String(product._id ?? index),
    name: product.name,
    price: formatPeso(product.price ?? null),
    status: product.active ? (product.price === null ? "Draft" : "Active") : "Archived",
    note: product.notes || (product.active ? "" : "Archived"),
    aliases: Array.isArray(product.aliases) ? product.aliases.map((a: any) => a.value) : [],
  }));
}

export async function getSharedOrder(publicId: string, userId?: string): Promise<SharedOrderView> {
  const ready = await canUseMongo();
  if (!ready) {
    throw new Error("DATABASE_NOT_READY");
  }

  const order = (await Order.findOne({ publicId }).populate("items.productId").lean()) as any;
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const isAuthor = !!(userId && order.authorId && String(order.authorId) === String(userId));
  if (order.isPublic !== true && !isAuthor) {
    throw new Error("ORDER_NOT_PUBLIC");
  }

  const items = Array.isArray(order.items)
    ? order.items.map((item: any, index: number) => {
        const quantityLabel = item.quantityLabel ?? `${item.quantity ?? 0}${item.unit ? ` ${item.unit}` : ""}`.trim();
        
        // Use the latest product price if available, fallback to stored unitPrice
        const productPrice = item.productId && typeof item.productId.price === "number" ? item.productId.price : null;
        const unitPrice = productPrice !== null ? productPrice : (typeof item.unitPrice === "number" ? item.unitPrice : null);
        
        const quantity = typeof item.quantity === "number" ? item.quantity : 1;
        const lineTotal = unitPrice !== null ? unitPrice * quantity : 0;

        return {
          id: String(item._id ?? index),
          itemName: item.itemName || "Unnamed item",
          quantityLabel,
          unitPrice,
          lineTotal,
          status: item.status ?? "draft",
        };
      })
    : [];

  const subtotal = items.reduce((sum: number, item: any) => sum + item.lineTotal, 0);
  const total = typeof order.total === "number" && order.status !== "draft" ? order.total : subtotal;

  return {
    publicId: order.publicId,
    title: order.title || `Order ${order.publicId}`,
    createdAtLabel: formatRelativeDate(order.createdAt),
    updatedAtLabel: formatRelativeDate(order.updatedAt),
    archivedAtLabel: order.archivedAt ? formatRelativeDate(order.archivedAt) : null,
    items,
    subtotal,
    total,
    receiptUrl: order.receiptUrl || null,
    isPublic: order.isPublic !== false,
    status: order.status ?? "draft",
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
    (error as any).code = "ITEM_NAME_TOO_SHORT";
    throw error;
  }

  if (cleanQuantityLabel.length < 1) {
    const error = new Error("Quantity label is required");
    (error as any).code = "QUANTITY_LABEL_TOO_SHORT";
    throw error;
  }

  const order = await Order.findOne({ publicId });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (!order.authorId || String(order.authorId) !== String(userId)) {
    const error = new Error("Forbidden");
    (error as any).code = "FORBIDDEN";
    throw error;
  }

  const parsedQuantity = parseInt(cleanQuantityLabel, 10);
  const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

  // Case-insensitive product matching
  const normalizedItemName = cleanItemName.toLowerCase();
  let matchedProduct = await Product.findOne({
    $or: [
      { normalizedName: normalizedItemName },
      { "aliases.value": normalizedItemName }
    ],
    active: true
  });

  if (!matchedProduct) {
    // Check if it exists but is deactivated
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

  const item = {
    productId: matchedProduct._id,
    itemName: matchedProduct.name,
    normalizedItemName,
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
      itemName: item.itemName,
      quantityLabel: item.quantityLabel,
    },
    note: `Added ${item.itemName}`,
  });

  const inserted = order.items[order.items.length - 1];
  return {
    id: String(inserted._id ?? order.items.length - 1),
    itemName: inserted.itemName,
    quantityLabel: inserted.quantityLabel,
    unitPrice: inserted.unitPrice ?? null,
    lineTotal: inserted.lineTotal ?? 0,
    status: inserted.status ?? "draft",
  };
}

export async function updateOrderItemQuantity(publicId: string, userId: string, itemIndex: number, quantityLabel: string) {
  const ready = await canUseMongo();
  if (!ready) {
    throw new Error("DATABASE_NOT_READY");
  }

  const cleanQuantityLabel = String(quantityLabel ?? "").trim();
  if (cleanQuantityLabel.length < 1) {
    const error = new Error("Quantity label is required");
    (error as any).code = "QUANTITY_LABEL_TOO_SHORT";
    throw error;
  }

  const order = await Order.findOne({ publicId });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (!order.authorId || String(order.authorId) !== String(userId)) {
    const error = new Error("Forbidden");
    (error as any).code = "FORBIDDEN";
    throw error;
  }

  if (!Array.isArray(order.items) || itemIndex < 0 || itemIndex >= order.items.length) {
    const error = new Error("ITEM_NOT_FOUND");
    (error as any).code = "ITEM_NOT_FOUND";
    throw error;
  }

  const item = order.items[itemIndex] as any;
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

  return {
    id: String(item._id ?? itemIndex),
    itemName: item.itemName,
    quantityLabel: item.quantityLabel,
    unitPrice: item.unitPrice ?? null,
    lineTotal: item.lineTotal ?? 0,
    status: item.status ?? "draft",
  };
}

export async function removeOrderItem(publicId: string, userId: string, itemIndex: number) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("DATABASE_NOT_READY");

  const order = await Order.findOne({ publicId });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  if (!order.authorId || String(order.authorId) !== String(userId)) {
    const error = new Error("Forbidden");
    (error as any).code = "FORBIDDEN";
    throw error;
  }

  if (!Array.isArray(order.items) || itemIndex < 0 || itemIndex >= order.items.length) {
    const error = new Error("ITEM_NOT_FOUND");
    (error as any).code = "ITEM_NOT_FOUND";
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

  if (!order.authorId || String(order.authorId) !== String(userId)) {
    throw new Error("FORBIDDEN");
  }

  const { fullItem, index } = auditLog.before as any;
  
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

  return auditLogs.map((entry: any) => {
    const after = entry.after ?? {};
    const before = entry.before ?? {};
    return {
      id: String(entry._id),
      date: new Date(entry.createdAt ?? Date.now()).toISOString().slice(0, 10),
      item: after.itemName || before.itemName || after.productName || entry.note || "Order update",
      quantity: String(after.quantityLabel || before.quantityLabel || after.quantity || "-"),
      action: entry.action.replace(/_/g, " ").replace(/\b\w/g, (char: string) => char.toUpperCase()),
      rawAction: entry.action,
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

  const newOrder = new Order({
    publicId,
    authorId: userId,
    title: dateStr,
    isPublic: false,
    status: "draft",
    items: [
      {
        itemName,
        quantity: 1,
        quantityLabel,
        status: "draft",
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
      itemName,
      quantityLabel,
    },
    note: `Added ${itemName}`,
  });

  return publicId;
}
export async function getAllUsersWithOrderCounts() {
  const ready = await canUseMongo();
  if (!ready) return [];

  const users = await User.find({}, { username: 1, email: 1, avatarUrl: 1, role: 1 }).lean();
  
  const userList = await Promise.all(users.map(async (user: any) => {
    const orderCount = await Order.countDocuments({ authorId: user._id });
    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
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

  return orders.map((order: any, index: number) => ({
    id: String(order._id),
    publicId: order.publicId,
    title: order.title || `Order ${order.publicId}`,
    preview: order.status === "draft" ? "Draft" : order.status === "paid" ? "Paid" : "Ready",
    items: `${Array.isArray(order.items) ? order.items.length : 0} items`,
    updated: formatRelativeDate(order.updatedAt ?? order.createdAt),
    active: false,
    isPublic: order.isPublic !== false,
    status: order.status || "draft",
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

export async function adminUpdateProduct(productId: string | null, data: any) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const normalizedName = data.name.toLowerCase();
  
  const updateData = {
    ...data,
    normalizedName,
    active: true
  };

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
    source.aliases.forEach((a: any) => aliasValues.add(a.value));
  }
  
  // Add target's existing aliases
  if (Array.isArray(target.aliases)) {
    target.aliases.forEach((a: any) => aliasValues.add(a.value));
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

  return true;
}

export async function adminDeleteProduct(productId: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");
  return Product.findByIdAndUpdate(productId, { active: false });
}
