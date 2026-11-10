import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@/services/token.service.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: "researcher" | "policy" | "admin";
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token." });
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userRole = payload.role;
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
