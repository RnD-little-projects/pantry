import { Order, Product } from "@/models";

import { connectMongo } from "./db/mongodb";
import { marketItems as fallbackMarketItems, workspaceSessions as fallbackSessions } from "./pantry-data";
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

function createDemoOrder(publicId: string): SharedOrderView {
  const createdAtLabel = "May 5, 2026";
  const items = [
    { itemName: "Rice", quantityLabel: "5 kg", unitPrice: 50, lineTotal: 250, status: "finalized" as const },
    { itemName: "Eggs", quantityLabel: "2 dozen", unitPrice: 90, lineTotal: 180, status: "finalized" as const },
    { itemName: "Milk", quantityLabel: "3 liters", unitPrice: 70, lineTotal: 210, status: "priced" as const },
    { itemName: "Sugar", quantityLabel: "2 kg", unitPrice: 80, lineTotal: 160, status: "draft" as const },
  ];

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    publicId,
    title: "Shareable order",
    createdAtLabel,
    updatedAtLabel: "Today",
    items,
    subtotal,
    total: subtotal,
    isPublic: true,
    status: "draft",
  };
}

export async function getOverviewSessions(): Promise<WorkspaceSession[]> {
  const ready = await canUseMongo();
  if (!ready) {
    return fallbackSessions.map<WorkspaceSession>((session) => ({ ...session }));
  }

  const orders = await Order.find({}, { publicId: 1, title: 1, items: 1, status: 1, updatedAt: 1, createdAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(6)
    .lean();

  if (!orders.length) {
    return fallbackSessions.map<WorkspaceSession>((session) => ({ ...session }));
  }

  return orders.map((order: LeanOrder, index: number) => ({
    id: String(order._id ?? order.publicId ?? index),
    publicId: order.publicId,
    title: order.title || `Order ${order.publicId}`,
    preview: order.status === "draft" ? "Draft and shareable" : order.status === "paid" ? "Paid" : "Ready for checkout",
    items: `${Array.isArray(order.items) ? order.items.length : 0} items`,
    updated: formatRelativeDate(order.updatedAt ?? order.createdAt),
    active: order.status === "draft" || index === 0,
    isPublic: order.isPublic !== false,
  }));
}

export async function getMarketItems(): Promise<MarketItem[]> {
  const ready = await canUseMongo();
  if (!ready) {
    return fallbackMarketItems.map<MarketItem>((item) => ({ ...item }));
  }

  const products = await Product.find({}, { name: 1, price: 1, active: 1, notes: 1 })
    .sort({ active: -1, updatedAt: -1 })
    .lean();

  if (!products.length) {
    return fallbackMarketItems.map<MarketItem>((item) => ({ ...item }));
  }

  return products.map((product: LeanProduct, index: number) => ({
    id: String(product._id ?? index),
    name: product.name,
    price: formatPeso(product.price ?? null),
    status: product.active ? (product.price === null ? "Draft" : "Fresh") : "Archived",
    note: product.notes || (product.active ? "Pending final price" : "Archived item"),
  }));
}

export async function getSharedOrder(publicId: string): Promise<SharedOrderView> {
  const ready = await canUseMongo();
  if (!ready) {
    return createDemoOrder(publicId);
  }

  const order = await Order.findOne({ publicId }).lean();
  if (!order) {
    throw new Error("ORDER_NOT_PUBLIC");
  }

  if (order.isPublic !== true) {
    throw new Error("ORDER_NOT_PUBLIC");
  }

  const items = Array.isArray(order.items)
    ? order.items.map((item: LeanOrderItem, index: number) => {
        const quantityLabel = item.quantityLabel ?? `${item.quantity ?? 0}${item.unit ? ` ${item.unit}` : ""}`.trim();

        return {
          id: String(item._id ?? index),
          itemName: item.itemName || "Unnamed item",
          quantityLabel,
          unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : null,
          lineTotal: typeof item.lineTotal === "number" ? item.lineTotal : 0,
          status: item.status ?? "draft",
        };
      })
    : [];

  const subtotal = typeof order.subtotal === "number" ? order.subtotal : items.reduce((sum: number, item: { lineTotal: number }) => sum + item.lineTotal, 0);

  return {
    publicId: order.publicId,
    title: order.title || `Order ${order.publicId}`,
    createdAtLabel: formatRelativeDate(order.createdAt),
    updatedAtLabel: formatRelativeDate(order.updatedAt),
    items,
    subtotal,
    total: typeof order.total === "number" ? order.total : subtotal,
    isPublic: order.isPublic !== false,
    status: order.status ?? "draft",
  };
}

export async function getOrderHistory(publicId: string): Promise<OrderHistoryEntry[]> {
  const ready = await canUseMongo();
  if (!ready) {
    return [
      { date: "2026-05-01", item: "Rice", quantity: "5 kg", action: "Added" },
      { date: "2026-05-02", item: "Eggs", quantity: "2 dozen", action: "Added" },
      { date: "2026-05-03", item: "Milk", quantity: "3 liters", action: "Added" },
      { date: "2026-05-04", item: "Sugar", quantity: "2 kg", action: "Added" },
    ];
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

  return auditLogs.map((entry: LeanAuditLog) => {
    const after = entry.after ?? {};
    return {
      date: new Date(entry.createdAt ?? Date.now()).toISOString().slice(0, 10),
      item: after.itemName || after.productName || entry.note || "Order update",
      quantity: String(after.quantityLabel || after.quantity || "-"),
      action: entry.action.replace(/_/g, " ").replace(/\b\w/g, (char: string) => char.toUpperCase()),
    };
  });
}
