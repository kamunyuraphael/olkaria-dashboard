import { sendTemporaryPassword } from "../services/mail.service.js";
import type { Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "@/models/User.model.js";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { deleteUserAndData } from "@/services/userCleanup.service.js";
import type { AuthedRequest } from "@/middleware/auth.middleware.js";

const ROLES = ["researcher", "policy", "admin"] as const;

async function activeAdminCount() {
  return User.countDocuments({ role: "admin", disabled: { $ne: true } });
}

// GET /api/users  (admin)
export async function listUsers(_req: AuthedRequest, res: Response) {
  const [users, counts] = await Promise.all([
    User.find().sort({ createdAt: -1 }),
    AnalysisJob.aggregate([{ $group: { _id: "$requestedBy", n: { $sum: 1 } } }]),
  ]);
  const runs = new Map(counts.map((c) => [String(c._id), c.n as number]));
  return res.json(
    users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      institution: u.institution,
      role: u.role,
      disabled: u.disabled === true,
      lastLoginAt: u.lastLoginAt?.toISOString(),
      createdAt: u.createdAt?.toISOString(),
      runs: runs.get(String(u._id)) ?? 0,
    }))
  );
}

// PATCH /api/users/:id  { role?, disabled? }  (admin)
export async function updateUser(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const { role, disabled } = req.body ?? {};

  const losesAdmin =
    user.role === "admin" &&
    !user.disabled &&
    ((role !== undefined && role !== "admin") || disabled === true);
  if (losesAdmin && (await activeAdminCount()) <= 1) {
    return res.status(409).json({ error: "This is the only active admin." });
  }
  if (role !== undefined) {
    if (!(ROLES as readonly string[]).includes(role)) return res.status(400).json({ error: "Invalid role." });
    user.role = role;
  }
  if (disabled !== undefined) user.disabled = disabled === true;
  await user.save();
  return res.json({ ok: true });
}

// POST /api/users/:id/reset-password  (admin) → one-time temporary password
export async function resetUserPassword(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  user.passwordHash = await bcrypt.hash(temporaryPassword, 12);
  user.mustChangePassword = true;
  await user.save();
  const emailed = await sendTemporaryPassword(user.email, user.name, temporaryPassword, "reset");
  return res.json({ temporaryPassword, emailed });
}

// DELETE /api/users/:id  (admin) — hard delete incl. runs, results and files.
export async function deleteUser(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (String(user._id) === req.userId) {
    return res.status(400).json({ error: "Use 'Delete my account' in Settings to remove yourself." });
  }
  if (user.role === "admin" && !user.disabled && (await activeAdminCount()) <= 1) {
    return res.status(409).json({ error: "This is the only active admin." });
  }
  const { jobs } = await deleteUserAndData(String(user._id));
  return res.json({ deletedJobs: jobs });
}
