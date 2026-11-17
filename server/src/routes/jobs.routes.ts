import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware.js";
import { listMyJobs, deleteMyJob } from "@/controllers/jobs.controller.js";

export const jobsRouter = Router();

// GET /api/jobs?stage=&module=&limit= — the signed-in user's own runs.
jobsRouter.get("/", requireAuth, listMyJobs);
jobsRouter.delete("/:id", requireAuth, deleteMyJob);
