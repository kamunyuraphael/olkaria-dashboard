import { Schema, model, type InferSchemaType } from "mongoose";

const accessRequestSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    institution: { type: String, required: true },
    role: { type: String, enum: ["researcher", "policy"], required: true },
    purpose: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approvedUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type AccessRequestDoc = InferSchemaType<typeof accessRequestSchema>;
export const AccessRequest = model("AccessRequest", accessRequestSchema);
