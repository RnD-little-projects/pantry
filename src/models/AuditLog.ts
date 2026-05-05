import { Schema, model, models, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    targetType: {
      type: String,
      enum: ["user", "order", "product", "category"],
      required: true,
      index: true,
    },
    targetId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["create", "update", "delete", "finalize", "pay", "share", "price_adjust", "alias_add"],
      required: true,
      index: true,
    },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;

export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);
