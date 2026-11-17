import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@/services/token.service.js";
import { User } from "@/models/User.model.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: "researcher" | "policy" | "admin";
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token." });
  }
  try {
    const payload = verifyToken(token);
    // Check the account on every call so deleting/disabling a user or changing
    // their role takes effect immediately instead of when the JWT expires.
    const user = await User.findById(payload.sub).select("role disabled");
    if (!user) return res.status(401).json({ error: "Account no longer exists." });
    if (user.disabled) return res.status(403).json({ error: "This account has been disabled." });
    req.userId = payload.sub;
    req.userRole = user.role as AuthedRequest["userRole"];
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Chain after requireAuth on any admin-only route (e.g. approving access
// requests). Separate from requireAuth itself so routes that just need "is
// someone logged in" don't pay for the role check.
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}
