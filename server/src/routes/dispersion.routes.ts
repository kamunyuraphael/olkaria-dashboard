import { Router } from "express";
import { upload } from "@/middleware/upload.middleware.js";
import { requireAuth } from "@/middleware/auth.middleware.js";
import { submitDispersionAnalysis, getDispersionJob } from "@/controllers/dispersion.controller.js";

export const dispersionRouter = Router();

dispersionRouter.post(
  "/analyze",
  requireAuth,
  upload.fields([
    { name: "metData", maxCount: 1 },
    { name: "CO2", maxCount: 1 },
    { name: "CH4", maxCount: 1 },
    { name: "H2S", maxCount: 1 },
  ]),
  submitDispersionAnalysis
);
dispersionRouter.get("/jobs/:jobId", requireAuth, getDispersionJob);
