import type { Response } from "express";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { DispersionResult } from "@/models/DispersionResult.model.js";
import { dispersionQueue } from "@/queue/analysisQueue.js";
import type { AuthedRequest } from "@/middleware/auth.middleware.js";

const GAS_FIELDS = ["CO2", "CH4", "H2S"] as const;

// POST /api/dispersion/analyze
// multipart fields: metData (required), CO2 / CH4 / H2S (>=1 required)
export async function submitDispersionAnalysis(req: AuthedRequest, res: Response) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  const metFile = files?.metData?.[0];
  if (!metFile) {
    return res.status(400).json({ error: "Met data file is required (field name: metData)." });
  }

  const inputFiles = [{ role: "metData", storedPath: metFile.path, originalName: metFile.originalname }];
  for (const gas of GAS_FIELDS) {
    const f = files?.[gas]?.[0];
    if (f) inputFiles.push({ role: gas, storedPath: f.path, originalName: f.originalname });
  }

  if (inputFiles.length === 1) {
    return res
      .status(400)
      .json({ error: "At least one gas's emission-source file is required (CO2, CH4, or H2S)." });
  }

  const analysisJob = await AnalysisJob.create({
    moduleType: "dispersion",
    stage: "queued",
    requestedBy: req.userId,
    inputFiles,
  });

  await dispersionQueue.add("analyze", { jobId: analysisJob._id.toString() });

  return res.status(202).json({ jobId: analysisJob._id.toString() });
}

// GET /api/dispersion/jobs/:jobId
export async function getDispersionJob(req: AuthedRequest, res: Response) {
  const analysisJob = await AnalysisJob.findOne({
    _id: req.params.jobId,
    requestedBy: req.userId,
    moduleType: "dispersion",
  });
  if (!analysisJob) return res.status(404).json({ error: "Job not found." });

  if (analysisJob.stage === "complete") {
    const result = await DispersionResult.findById(analysisJob.resultRef);
    return res.json({
      stage: "complete",
      startedAt: analysisJob.startedAt?.getTime(),
      result: result?.gases,
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
