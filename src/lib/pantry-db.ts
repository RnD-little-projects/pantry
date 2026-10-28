import { AuditLog, Order, Product, User, Category } from "@/models";
import { randomBytes } from "crypto";

import { connectMongo } from "./db/mongodb";
import { escapeRegex } from "./utils";
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

function codedError(code: string, message = code) {
  return Object.assign(new Error(message), { code });
}

// Owner-only writes; archived (paid) orders are locked
function assertCanEdit(order: { authorId?: unknown; status?: string | null }, userId: string) {
  if (!order.authorId || String(order.authorId) !== String(userId)) {
    throw codedError("FORBIDDEN", "Forbidden");
  }
  if (order.status === "archived") {
    throw codedError("ORDER_LOCKED", "This order is archived and can no longer change");
  }
}

// Items are addressed by position; the name the user saw guards against a list that changed in another tab
function itemAt<T extends { itemName?: string | null }>(order: { items?: T[] }, itemIndex: number, itemName: string): T {
  const item = Array.isArray(order.items) ? order.items[itemIndex] : undefined;
  if (!item) {
    throw codedError("ITEM_NOT_FOUND");
  }
  if (item.itemName !== itemName) {
    throw codedError("ITEM_CHANGED", "This list changed. Refresh and try again.");
  }
  return item;
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

  // Orders are private: signed-out visitors have no list of their own
  if (!userId) {
    return [];
  }

  const orders = await Order.find({ authorId: userId }, { publicId: 1, title: 1, items: 1, status: 1, updatedAt: 1, createdAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(6)
    .lean();

  return orders.map((order: LeanOrder, index: number) => ({
    id: String(order._id ?? order.publicId ?? index),
    publicId: order.publicId,
    title: order.title || `Order ${order.publicId}`,
    preview: order.status === "draft" ? "Draft" : order.status === "paid" ? "Paid" : "Ready for checkout",
    items: `${Array.isArray(order.items) ? order.items.length : 0} items`,
    updated: formatRelativeDate(order.updatedAt ?? order.createdAt),
    active: order.status === "draft" || index === 0,
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

export async function getSharedOrder(publicId: string, userId?: string, viewerRole?: string): Promise<SharedOrderView> {
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
  
  // Only the owner and staff (who price and review orders) may open an order
  const isStaff = viewerRole === "admin" || viewerRole === "cashier";
  if (!isAuthor && !isStaff) {
    throw new Error("ORDER_FORBIDDEN");
  }

  const orderItems = order.items as Record<string, unknown>[] | null;
  const items = Array.isArray(orderItems)
    ? orderItems.map((item: Record<string, unknown>, index: number) => {
        const quantityLabel = item.quantityLabel ?? `${item.quantity ?? 0}${item.unit ? ` ${item.unit}` : ""}`.trim();
        
        // Use the latest product price if available, fallback to stored unitPrice
        const populatedProduct = item.productId as Record<string, unknown> | null;
        const productPrice = populatedProduct && typeof populatedProduct === "object" && typeof populatedProduct.price === "number" ? populatedProduct.price : null;
        
        // For archived orders, always freeze the price to item.unitPrice if it was set
        const unitPrice = order.status === "archived" && typeof item.unitPrice === "number"
          ? item.unitPrice
          : (productPrice !== null ? productPrice : (typeof item.unitPrice === "number" ? item.unitPrice : null));
        
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
  const total = typeof order.total === "number" && order.total > 0 && order.status !== "draft" ? order.total : subtotal;

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
    paymentMethod: (order.paymentMethod as "cash" | "receipt" | null) ?? null,
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

  assertCanEdit(order, userId);

  const parsedQuantity = parseInt(cleanQuantityLabel, 10);
  const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

  const matchedProduct = await getOrCreateProduct(cleanItemName);

  // Same product already on the list: add to its quantity instead of a duplicate row.
  const existing = order.items.find(
    (entry: Record<string, unknown>) => String(entry.productId) === String(matchedProduct._id)
  ) as Record<string, unknown> | undefined;
  if (existing) {
    const oldQuantityLabel = String(existing.quantityLabel ?? "").trim();
    const newQuantity = (Number(existing.quantity) || 0) + quantity;
    existing.quantity = newQuantity;
    existing.quantityLabel = String(newQuantity);
    existing.lineTotal = typeof existing.unitPrice === "number" ? existing.unitPrice * newQuantity : 0;
    order.markModified("items");
    await order.save();

    await AuditLog.create({
      actorId: userId,
      targetType: "order",
      targetId: publicId,
      action: "quantity_update",
      before: { itemName: existing.itemName, quantityLabel: oldQuantityLabel },
      after: { itemName: existing.itemName, quantityLabel: existing.quantityLabel },
      note: `Added ${quantity} to ${existing.itemName}`,
    });

    return {
      id: String(existing._id ?? order.items.indexOf(existing)),
      itemName: String(existing.itemName),
      quantityLabel: String(existing.quantityLabel),
      unitPrice: (existing.unitPrice as number | undefined) ?? null,
      lineTotal: Number(existing.lineTotal) || 0,
      status: (existing.status as string | undefined) ?? "draft",
    };
  }

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

  return result;
}

export async function updateOrderItemQuantity(publicId: string, userId: string, itemIndex: number, itemName: string, quantityLabel: string) {
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

  assertCanEdit(order, userId);
  const item = itemAt(order, itemIndex, itemName) as Record<string, unknown>;
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

  return result;
}

export async function removeOrderItem(publicId: string, userId: string, itemIndex: number, itemName: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("DATABASE_NOT_READY");

  const order = await Order.findOne({ publicId });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  assertCanEdit(order, userId);
  const removedItem = itemAt(order, itemIndex, itemName) as Record<string, unknown>;
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

  const user = await User.findById(userId).lean();
  const isAdmin = user?.role === "admin";

  if (!isAdmin && (!order.authorId || String(order.authorId) !== String(userId))) {
    throw new Error("FORBIDDEN");
  }
  if (order.status === "archived") {
    throw new Error("ORDER_LOCKED");
  }

  // Claim the log entry first so a double tap can't restore the item twice
  const claimed = await AuditLog.findOneAndDelete({ _id: auditLogId, action: "item_remove" });
  if (!claimed) {
    throw new Error("ALREADY_UNDONE");
  }

  const { fullItem, index } = claimed.before as { fullItem: Record<string, unknown>; index: number };
  
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

  if (!userId) {
    return null;
  }

  const latestOrder = await Order.findOne({ authorId: userId, status: { $ne: "archived" } }, { publicId: 1 })
    .sort({ updatedAt: -1 })
    .lean();

  return latestOrder?.publicId || null;
}

export async function createNewOrder(userId: string, itemName: string, quantityLabel: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const activeOrderError = "You already have an active order. Please archive it before creating a new one.";
  const existingActiveOrder = await Order.findOne({ authorId: userId, status: { $ne: "archived" } }).lean();
  if (existingActiveOrder) {
    throw new Error(activeOrderError);
  }

  const publicId = randomBytes(8).toString("base64url");
  
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

  try {
    await newOrder.save();
  } catch (error) {
    // The one-open-order-per-user index catches a double submit that passed the check above
    const dup = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (dup.code === 11000 && dup.keyPattern?.authorId) {
      throw new Error(activeOrderError);
    }
    throw error;
  }

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

  return publicId;
}
export async function getAllUsersWithOrderCounts() {
  const ready = await canUseMongo();
  if (!ready) return [];

  const [users, counts] = await Promise.all([
    User.find({}, { username: 1, email: 1, avatarUrl: 1, role: 1 }).lean(),
    Order.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$authorId", n: { $sum: 1 } } }]),
  ]);
  const countByUser = new Map(counts.map((row) => [String(row._id), row.n]));

  return users.map((user: Record<string, unknown>) => ({
    id: String(user._id),
    username: String(user.username ?? ""),
    email: (user.email as string | null) ?? null,
    avatarUrl: (user.avatarUrl as string | null) ?? null,
    role: String(user.role ?? "user"),
    orderCount: countByUser.get(String(user._id)) ?? 0,
  }));
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
    status: (order.status as string) || "draft",
  }));
}

export async function getCategories() {
  const ready = await canUseMongo();
  if (!ready) return [];
  return Category.find({ active: true }).sort({ name: 1 }).lean();
}

export async function adminUpsertCategory(name: string, adminUserId?: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const category = await Category.findOneAndUpdate(
    { slug },
    { name, slug, active: true },
    { upsert: true, new: true }
  );

  if (adminUserId && category) {
    await AuditLog.create({
      actorId: adminUserId,
      targetType: "category",
      targetId: String(category._id),
      action: "category_upsert",
      after: { name, slug },
      note: `Admin upserted category ${name}`
    });
  }

  return category;
}

export async function adminUpdateProduct(productId: string | null, data: Record<string, unknown>, adminUserId?: string) {
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
    
    if (adminUserId && product) {
      await AuditLog.create({
        actorId: adminUserId,
        targetType: "product",
        targetId: productId,
        action: "product_update",
        after: updateData,
        note: `Admin updated product ${product.name}`
      });
    }

    return product;
  } else {
    const product = await Product.create(updateData);
    if (adminUserId) {
      await AuditLog.create({
        actorId: adminUserId,
        targetType: "product",
        targetId: String(product._id),
        action: "product_create",
        after: updateData,
        note: `Admin created product ${product.name}`
      });
    }
    return product;
  }
}

export async function adminMergeProducts(sourceId: string, targetId: string, adminUserId?: string) {
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

  if (adminUserId) {
    await AuditLog.create({
      actorId: adminUserId,
      targetType: "product",
      targetId: targetId,
      action: "product_merge",
      before: { sourceId, sourceName: source.name },
      after: { targetId, targetName: target.name },
      note: `Admin merged product ${source.name} into ${target.name}`
    });
  }

  return true;
}

export async function adminDeleteProduct(productId: string, adminUserId?: string) {
  const ready = await canUseMongo();
  if (!ready) throw new Error("Database not ready");

  const product = await Product.findByIdAndUpdate(productId, { active: false });
  if (!product) return null;

  if (adminUserId) {
    await AuditLog.create({
      actorId: adminUserId,
      targetType: "product",
      targetId: productId,
      action: "product_delete",
      before: { name: product.name, active: product.active },
      after: { active: false },
      note: `Admin soft-deleted product ${product.name}`
    });
  }

  // Remove this product from all orders that have it
  // Paid (archived) orders keep their lines so they still match what was paid
  const affectedOrders = await Order.find({ "items.productId": productId, status: { $ne: "archived" } });
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
    }
  }

  return product;
}

export async function getAuditLogUsers() {
  const ready = await canUseMongo();
  if (!ready) return [];

  const distinctActorIds = await AuditLog.distinct("actorId");
  const users = await User.find({ _id: { $in: distinctActorIds } }, { username: 1, email: 1 }).lean();
  return JSON.parse(JSON.stringify(users));
}

export async function getPaginatedAuditLogs(
  page = 1, 
  limit = 20, 
  searchQuery = "", 
  selectedUsers: string[] = [], 
  selectedActions: string[] = []
) {
  const ready = await canUseMongo();
  if (!ready) return { logs: [], hasMore: false };

  const query: Record<string, any> = {};

  if (searchQuery.trim()) {
    const q = escapeRegex(searchQuery.trim());
    const matchingUsers = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ]
    }, { _id: 1 }).lean();
    const userIds = matchingUsers.map((u: Record<string, unknown>) => u._id);

    query.$or = [
      { note: { $regex: q, $options: "i" } },
      { targetId: { $regex: q, $options: "i" } },
      { action: { $regex: q, $options: "i" } },
      { actorId: { $in: userIds } }
    ];
  }

  if (selectedUsers.length > 0) {
    query.actorId = { $in: selectedUsers };
  }

  if (selectedActions.length > 0) {
    query.action = { $in: selectedActions };
  }

  const skip = (page - 1) * limit;
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .populate("actorId", "username email avatarUrl")
    .lean();

  const hasMore = logs.length > limit;
  const slicedLogs = hasMore ? logs.slice(0, limit) : logs;

  return {
    logs: JSON.parse(JSON.stringify(slicedLogs)),
    hasMore
  };
}
