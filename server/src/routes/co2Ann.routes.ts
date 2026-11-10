import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware.js";
import { submitCo2AnnAnalysis, getCo2AnnJob } from "@/controllers/co2Ann.controller.js";

export const co2AnnRouter = Router();

// JSON body: { latitude, longitude, radiusKm, startDate?, endDate? } — no
// uploads. CO2 ANN now fetches its own data from satellite given just
// coordinates + a buffer radius, same input shape as Module A's SO2/CH4
// flow (see server/API_CONTRACT.md).
co2AnnRouter.post("/analyze", requireAuth, submitCo2AnnAnalysis);
co2AnnRouter.get("/jobs/:jobId", requireAuth, getCo2AnnJob);
