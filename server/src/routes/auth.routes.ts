import { Router } from "express";
import { rateLimit } from "@/middleware/rateLimit.middleware.js";
import { requireAuth, requireAdmin } from "@/middleware/auth.middleware.js";
import {
  login,
  requestAccess,
  logout,
  me,
  updateMyLocation,
  changePassword,
  deleteMyAccount,
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from "@/controllers/auth.controller.js";

export const authRouter = Router();

// 10 attempts / 15 min per IP + email.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  key: (req) => `${req.ip}:${String(req.body?.email ?? "").toLowerCase()}`,
});
authRouter.post("/login", loginLimiter, login);
authRouter.post("/request-access", requestAccess);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
authRouter.patch("/me/location", requireAuth, updateMyLocation);
authRouter.post("/change-password", requireAuth, changePassword);
authRouter.delete("/me", requireAuth, deleteMyAccount);

// Admin-only access-request review. No self-service signup - accounts are
// only created by an admin approving a pending request (see
// server/API_CONTRACT.md for why: each analysis run has a real compute
// cost, so access is manually gated).
authRouter.get("/access-requests", requireAuth, requireAdmin, listAccessRequests);
authRouter.post("/access-requests/:id/approve", requireAuth, requireAdmin, approveAccessRequest);
authRouter.post("/access-requests/:id/reject", requireAuth, requireAdmin, rejectAccessRequest);
