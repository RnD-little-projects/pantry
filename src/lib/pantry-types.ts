export type WorkspaceSession = {
  id?: string;
  publicId?: string;
  title: string;
  preview: string;
  items: string;
  updated: string;
  active: boolean;
  isPublic?: boolean;
};

export type MarketItem = {
  id?: string;
  name: string;
  price: string;
  status: "Fresh" | "Draft" | "Archived";
  note: string;
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
  date: string;
  item: string;
  quantity: string;
  action: string;
};

export type SharedOrderView = {
  publicId: string;
  title: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  items: SessionLineItem[];
  subtotal: number;
  total: number;
  isPublic: boolean;
  status: "draft" | "finalized" | "paid" | "unpaid" | "archived";
};
