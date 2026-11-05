import { Schema, model, models, type InferSchemaType } from "mongoose";

// Feedback from users; only admins can read it
const feedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: ["bug", "idea", "other"], default: "other" },
    rating: { type: Number, min: 1, max: 5, default: null },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    page: { type: String, trim: true, default: "", maxlength: 200 },
    status: { type: String, enum: ["new", "read", "archived"], default: "new", index: true },
  },
  { timestamps: true },
);

export type FeedbackDocument = InferSchemaType<typeof feedbackSchema>;

// Hot reload keeps the old compiled model, so drop it in dev to pick up schema changes (same as AuditLog)
if (process.env.NODE_ENV === "development" && models.Feedback) {
  delete models.Feedback;
}

export const Feedback = models.Feedback || model("Feedback", feedbackSchema);
