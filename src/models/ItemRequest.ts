import { Schema, model, models, type InferSchemaType } from "mongoose";

// An item a user asked the store to stock; staff check the shelves and answer
const itemRequestSchema = new Schema(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Lowercased name so requests for the same thing group together
    normalizedName: { type: String, required: true, trim: true, lowercase: true, index: true },
    note: { type: String, trim: true, default: "", maxlength: 300 },
    // Other users who want it too (the requester is not in here)
    likes: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    status: {
      type: String,
      enum: ["pending", "available", "unavailable", "added"],
      default: "pending",
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    staffNote: { type: String, trim: true, default: "", maxlength: 300 },
    handledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type ItemRequestDocument = InferSchemaType<typeof itemRequestSchema>;

// Hot reload keeps the old compiled model, so drop it in dev to pick up schema changes (same as AuditLog)
if (process.env.NODE_ENV === "development" && models.ItemRequest) {
  delete models.ItemRequest;
}

export const ItemRequest = models.ItemRequest || model("ItemRequest", itemRequestSchema);
