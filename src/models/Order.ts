import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    itemName: { type: String, trim: true, default: null },
    normalizedItemName: { type: String, trim: true, lowercase: true, default: null, index: true },
    quantity: { type: Number, required: true, min: 1 },
    quantityLabel: { type: String, trim: true, default: "" },
    unit: { type: String, trim: true, default: "" },
    unitPrice: { type: Number, default: null, min: 0 },
    lineTotal: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["draft", "finalized", "priced"],
      default: "draft",
      index: true,
    },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, default: "" },
    items: { type: [orderItemSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "finalized", "paid", "unpaid", "archived"],
      default: "draft",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
      index: true,
    },
    subtotal: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    sharedWith: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: "User" },
          role: { type: String, enum: ["viewer", "cashier", "editor"], default: "viewer" },
        },
      ],
      default: [],
    },
    isPublic: { type: Boolean, default: true, index: true },
    finalizedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    receiptUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  authorId: Types.ObjectId;
};

if (process.env.NODE_ENV === "development" && models.Order) {
  delete models.Order;
}

export const Order = models.Order || model("Order", orderSchema);
