import { Router } from "express";
import { requireAuth, requireAdmin } from "@/middleware/auth.middleware.js";
import {
  login,
  requestAccess,
  logout,
  me,
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from "@/controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/request-access", requestAccess);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);

// Admin-only access-request review. No self-service signup — accounts are
// only created by an admin approving a pending request (see
// server/API_CONTRACT.md for why: each analysis run has a real compute
// cost, so access is manually gated).
authRouter.get("/access-requests", requireAuth, requireAdmin, listAccessRequests);
authRouter.post("/access-requests/:id/approve", requireAuth, requireAdmin, approveAccessRequest);
authRouter.post("/access-requests/:id/reject", requireAuth, requireAdmin, rejectAccessRequest);
