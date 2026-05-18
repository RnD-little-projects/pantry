export type WorkspaceSession = {
  id?: string;
  publicId?: string;
  title: string;
  preview: string;
  items: string;
  updated: string;
  active: boolean;
  isPublic?: boolean;
  status?: string;
};

export type MarketItem = {
  id?: string;
  name: string;
  price: string;
  status: "Active" | "Draft" | "Archived";
  note: string;
  aliases?: string[];
};

export type SessionLineItem = {
  id?: string;
  itemName: string;
  quantityLabel: string;
  unitPrice: number | null;
  lineTotal: number;
  status: "draft" | "priced" | "finalized";
};

export type OrderHistoryEntry = {
  id: string;
  date: string;
  item: string;
  quantity: string;
  action: string;
  rawAction?: string;
  isAdminRemove?: boolean;
};

export type SharedOrderView = {
  publicId: string;
  title: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  archivedAtLabel?: string | null;
  items: SessionLineItem[];
  subtotal: number;
  total: number;
  receiptUrl?: string | null;
  isPublic: boolean;
  status: "draft" | "finalized" | "paid" | "unpaid" | "archived";
  isAuthor?: boolean;
};

export type AddOrderItemRequest = {
  publicId?: string;
  itemIndex?: number;
  itemName: string;
  quantityLabel: string;
};

export type AddOrderItemResponse = {
  item: {
    id: string;
    itemName: string;
    quantityLabel: string;
    unitPrice: number | null;
    lineTotal: number;
    status: "draft" | "priced" | "finalized";
  };
};
