import type { Response } from "express";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { Co2AnnResult } from "@/models/Co2AnnResult.model.js";
import { co2AnnQueue } from "@/queue/analysisQueue.js";
import type { AuthedRequest } from "@/middleware/auth.middleware.js";

// POST /api/co2-ann/analyze
// JSON body: { gas?, latitude, longitude, radiusKm, startDate?, endDate? } —
// gas is "SO2" | "CH4" | "CO2" (default "CO2"). The analysis-service fetches
// that gas + weather data from satellite for this site/window itself; no
// files are uploaded here. Route/queue names keep the historical "co2-ann"
// label but now serve all three Module A gases.
export async function submitCo2AnnAnalysis(req: AuthedRequest, res: Response) {
  const { gas = "CO2", latitude, longitude, radiusKm, startDate, endDate } = req.body ?? {};

  if (gas !== "SO2" && gas !== "CH4" && gas !== "CO2") {
    return res.status(400).json({ error: "gas must be one of SO2, CH4, CO2." });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number" || typeof radiusKm !== "number") {
    return res.status(400).json({
      error: "latitude, longitude and radiusKm are required and must be numbers.",
    });
  }
  if (radiusKm <= 0) {
    return res.status(400).json({ error: "radiusKm must be greater than 0." });
  }

  const analysisJob = await AnalysisJob.create({
    moduleType: "co2-ann",
    stage: "queued",
    requestedBy: req.userId,
    coordinates: { gas, latitude, longitude, radiusKm, startDate, endDate },
  });

  await co2AnnQueue.add("analyze", { jobId: analysisJob._id.toString() });

  return res.status(202).json({ jobId: analysisJob._id.toString() });
}

// GET /api/co2-ann/jobs/:jobId
export async function getCo2AnnJob(req: AuthedRequest, res: Response) {
  const analysisJob = await AnalysisJob.findOne({
    _id: req.params.jobId,
    requestedBy: req.userId,
    moduleType: "co2-ann",
  });
  if (!analysisJob) return res.status(404).json({ error: "Job not found." });

  if (analysisJob.stage === "complete") {
    const result = await Co2AnnResult.findById(analysisJob.resultRef);
    return res.json({
      stage: "complete",
      startedAt: analysisJob.startedAt?.getTime(),
      result: result
        ? { timeSeries: result.timeSeries, correlations: result.correlations }
        : undefined,
    });
  }

  if (analysisJob.stage === "failed") {
    return res.json({
      stage: "failed",
      startedAt: analysisJob.startedAt?.getTime(),
      error: analysisJob.failureReason ?? "Analysis failed.",
    });
  }

  return res.json({
    stage: analysisJob.stage,
    startedAt: analysisJob.startedAt?.getTime(),
  });
}
