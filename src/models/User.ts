import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    passwordHash: { type: String, default: null },
    role: {
      type: String,
      enum: ["user", "cashier", "viewer", "admin"],
      default: "user",
      index: true,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    providerAccountId: { type: String, trim: true, default: null },
    avatarUrl: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    forcePasswordChange: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = models.User || model("User", userSchema);
