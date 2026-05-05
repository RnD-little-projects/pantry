import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const productAliasSchema = new Schema(
  {
    value: { type: String, required: true, trim: true, lowercase: true },
    source: { type: String, trim: true, default: "manual" },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    aliases: { type: [productAliasSchema], default: [] },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    price: { type: Number, default: null, min: 0 },
    unit: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export type ProductDocument = InferSchemaType<typeof productSchema> & { categoryId: Types.ObjectId | null };

export const Product = models.Product || model("Product", productSchema);
