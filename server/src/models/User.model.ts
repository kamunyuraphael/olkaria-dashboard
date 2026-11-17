import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    institution: { type: String, required: true },
    role: { type: String, enum: ["researcher", "policy", "admin"], required: true },
    // Optional "home" location the dashboard pre-fills new analyses with.
    defaultLocation: {
      type: {
        label: { type: String },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      required: false,
      _id: false,
    },
    // Admin can disable an account (kept, but cannot sign in or call the API).
    disabled: { type: Boolean, default: false },
    // Set when an admin issues a temporary password; cleared once the user picks their own.
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
