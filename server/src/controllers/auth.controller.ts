import { sendTemporaryPassword } from "../services/mail.service.js";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "@/models/User.model.js";
import { AccessRequest } from "@/models/AccessRequest.model.js";
import { signToken } from "@/services/token.service.js";
import { deleteUserAndData } from "@/services/userCleanup.service.js";
import type { AuthedRequest } from "@/middleware/auth.middleware.js";

const BCRYPT_ROUNDS = 12;

function userJson(user: {
  _id: unknown;
  name: string;
  email: string;
  institution: string;
  role: string;
  mustChangePassword?: boolean | null;
  defaultLocation?: { label?: string | null; latitude: number; longitude: number } | null;
}) {
  const loc = user.defaultLocation;
  return {
    mustChangePassword: user.mustChangePassword === true,
    defaultLocation: loc
      ? { label: loc.label ?? undefined, latitude: loc.latitude, longitude: loc.longitude }
      : null,
    id: String(user._id),
    name: user.name,
    email: user.email,
    institution: user.institution,
    role: user.role,
  };
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (user.disabled) {
    return res.status(403).json({ error: "This account has been disabled. Contact an administrator." });
  }
  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken({ sub: String(user._id), role: user.role as "researcher" | "policy" | "admin" });
  return res.json({ token, user: userJson(user) });
}

// POST /api/auth/request-access
export async function requestAccess(req: Request, res: Response) {
  const { name, email, institution, role, purpose } = req.body ?? {};
  if (
    typeof name !== "string" || !name ||
    typeof email !== "string" || !email ||
    typeof institution !== "string" || !institution ||
    typeof purpose !== "string" || !purpose ||
    (role !== "researcher" && role !== "policy")
  ) {
    return res.status(400).json({
      error: "name, email, institution, purpose (all non-empty strings) and role ('researcher' | 'policy') are required.",
    });
  }

  const accessRequest = await AccessRequest.create({
    name,
    email: email.toLowerCase(),
    institution,
    role,
    purpose,
  });

  return res.status(201).json({ id: accessRequest._id.toString(), status: accessRequest.status });
}

// GET /api/auth/me
// Lets the frontend restore a session from a stored token on load, rather
// than trusting stale localStorage data - also the only way to notice a
// user was deleted or a token is otherwise no longer valid.
export async function me(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.json({ user: userJson(user) });
}

// PATCH /api/auth/me/location  { latitude, longitude, label? }  (or { clear: true })
export async function updateMyLocation(req: AuthedRequest, res: Response) {
  const { latitude, longitude, label, clear } = req.body ?? {};
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  if (clear === true) {
    user.set("defaultLocation", undefined);
  } else {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: "latitude (-90..90) and longitude (-180..180) are required." });
    }
    user.set("defaultLocation", {
      latitude: lat,
      longitude: lng,
      label: typeof label === "string" && label.trim() ? label.trim().slice(0, 80) : undefined,
    });
  }
  await user.save();
  return res.json({ user: userJson(user) });
}

// POST /api/auth/change-password  { currentPassword, newPassword }
export async function changePassword(req: AuthedRequest, res: Response) {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "currentPassword and newPassword are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: "New password must be different from the current one." });
  }
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.mustChangePassword = false;
  await user.save();
  return res.json({ user: userJson(user) });
}

// DELETE /api/auth/me  { password } — removes the account and all of its runs.
export async function deleteMyAccount(req: AuthedRequest, res: Response) {
  const { password } = req.body ?? {};
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Password is incorrect." });
  }
  if (user.role === "admin" && (await User.countDocuments({ role: "admin", disabled: { $ne: true } })) <= 1) {
    return res.status(409).json({ error: "You are the only admin. Make someone else an admin first." });
  }
  await deleteUserAndData(user._id.toString());
  return res.status(204).end();
}

// POST /api/auth/logout
// Stateless JWTs - there's no server-side session to clear. This endpoint
// exists so the frontend has a consistent call to make on sign-out; the
// actual logout is the client discarding its token. If token revocation
// (e.g. "log out everywhere") is ever needed, this is the place to add a
// denylist check.
export async function logout(_req: Request, res: Response) {
  return res.status(204).end();
}

// GET /api/auth/access-requests?status=pending  (admin only)
export async function listAccessRequests(req: AuthedRequest, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const filter = status ? { status } : {};
  const requests = await AccessRequest.find(filter).sort({ createdAt: -1 });
  return res.json(
    requests.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      email: r.email,
      institution: r.institution,
      role: r.role,
      purpose: r.purpose,
      status: r.status,
      createdAt: r.createdAt,
    }))
  );
}

// POST /api/auth/access-requests/:id/approve  (admin only)
// Creates the User account and returns a one-time temporary password for
// the admin to relay to the applicant out-of-band - there's no email
// service in this stack yet to send an invite link, so this is the
// pragmatic placeholder. Revisit once one exists.
export async function approveAccessRequest(req: AuthedRequest, res: Response) {
  const accessRequest = await AccessRequest.findById(req.params.id);
  if (!accessRequest) return res.status(404).json({ error: "Access request not found." });
  if (accessRequest.status !== "pending") {
    return res.status(409).json({ error: `Access request is already ${accessRequest.status}.` });
  }

  const existing = await User.findOne({ email: accessRequest.email });
  if (existing) {
    return res.status(409).json({ error: "A user with this email already exists." });
  }

  const temporaryPassword = crypto.randomBytes(9).toString("base64url"); // 12 chars, no padding
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const user = await User.create({
    name: accessRequest.name,
    email: accessRequest.email,
    institution: accessRequest.institution,
    role: accessRequest.role,
    passwordHash,
    mustChangePassword: true,
  });

  accessRequest.status = "approved";
  accessRequest.approvedUserId = user._id;
  await accessRequest.save();

  const emailed = await sendTemporaryPassword(user.email, user.name, temporaryPassword, "approved");
  return res.json({ user: userJson(user), temporaryPassword, emailed });
}

// POST /api/auth/access-requests/:id/reject  (admin only)
export async function rejectAccessRequest(req: AuthedRequest, res: Response) {
  const accessRequest = await AccessRequest.findById(req.params.id);
  if (!accessRequest) return res.status(404).json({ error: "Access request not found." });
  if (accessRequest.status !== "pending") {
    return res.status(409).json({ error: `Access request is already ${accessRequest.status}.` });
  }

  accessRequest.status = "rejected";
  await accessRequest.save();

  return res.status(204).end();
}
