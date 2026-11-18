import type { Response } from "express";
import fs from "node:fs/promises";
import { Co2AnnResult } from "@/models/Co2AnnResult.model.js";
import { DispersionResult } from "@/models/DispersionResult.model.js";
import { co2AnnQueue, dispersionQueue } from "@/queue/analysisQueue.js";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import type { AuthedRequest } from "@/middleware/auth.middleware.js";

const STAGES = ["queued", "running", "complete", "failed", "cancelled"] as const;
const MODULES = ["co2-ann", "dispersion"] as const;

// GET /api/jobs
// Light summaries only (no result payloads) — open a run through its
// module's GET /jobs/:id to load the stored output.
export async function listMyJobs(req: AuthedRequest, res: Response) {
  const stage = typeof req.query.stage === "string" ? req.query.stage : undefined;
  const mod = typeof req.query.module === "string" ? req.query.module : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);

  const filter: Record<string, unknown> = { requestedBy: req.userId };
  if (stage && (STAGES as readonly string[]).includes(stage)) filter.stage = stage;
  if (mod && (MODULES as readonly string[]).includes(mod)) filter.moduleType = mod;

  const [docs, grouped] = await Promise.all([
    AnalysisJob.find(filter).sort({ createdAt: -1 }).limit(limit),
    AnalysisJob.aggregate([
      { $match: { requestedBy: (AnalysisJob.schema.path("requestedBy") as any).cast(req.userId) } },
      { $group: { _id: "$stage", n: { $sum: 1 } } },
    ]),
  ]);

  const counts = { total: 0, queued: 0, running: 0, complete: 0, failed: 0, cancelled: 0 };
  for (const g of grouped) {
    if (g._id in counts) (counts as Record<string, number>)[g._id] = g.n;
    counts.total += g.n;
  }

  const jobs = docs.map((j) => {
    const dispersionGases = j.moduleType === "dispersion"
      ? j.inputFiles.map((f) => f.role).filter((r) => r !== "metData")
      : [];
    return {
      id: String(j._id),
      module: j.moduleType,
      stage: j.stage,
      dataSource: j.moduleType === "co2-ann" ? (j.dataSource ?? "satellite") : "upload",
      gas: j.moduleType === "co2-ann" ? (j.coordinates?.gas ?? j.gas ?? "CO2") : undefined,
      gases: dispersionGases,
      label: j.siteLabel ?? undefined,
      coordinates: j.coordinates
        ? {
            latitude: j.coordinates.latitude,
            longitude: j.coordinates.longitude,
            radiusKm: j.coordinates.radiusKm,
            startDate: j.coordinates.startDate,
            endDate: j.coordinates.endDate,
          }
        : undefined,
      error: j.stage === "failed" ? j.failureReason ?? "Analysis failed." : j.stage === "cancelled" ? "Stopped by you." : undefined,
      createdAt: j.createdAt?.toISOString(),
      completedAt: j.completedAt?.toISOString(),
    };
  });

  return res.json({ counts, jobs });
}

// DELETE /api/jobs/:id — remove one of your own finished/failed runs and its stored output.
export async function deleteMyJob(req: AuthedRequest, res: Response) {
  const job = await AnalysisJob.findOne({ _id: req.params.id, requestedBy: req.userId });
  if (!job) return res.status(404).json({ error: "Run not found." });
  if (job.stage === "queued" || job.stage === "running") {
    return res.status(409).json({ error: "This run is still in progress. Stop it first." });
  }
  for (const f of job.inputFiles) await fs.rm(f.storedPath, { force: true }).catch(() => undefined);
  if (job.resultRef) {
    if (job.resultModel === "DispersionResult") await DispersionResult.deleteOne({ _id: job.resultRef });
    else await Co2AnnResult.deleteOne({ _id: job.resultRef });
  }
  await job.deleteOne();
  return res.status(204).end();
}

async function removeJobData(job: InstanceType<typeof AnalysisJob>) {
  for (const f of job.inputFiles) await fs.rm(f.storedPath, { force: true }).catch(() => undefined);
  if (job.resultRef) {
    if (job.resultModel === "DispersionResult") await DispersionResult.deleteOne({ _id: job.resultRef });
    else await Co2AnnResult.deleteOne({ _id: job.resultRef });
  }
  await job.deleteOne();
}

// DELETE /api/jobs?stage=failed — remove all of your failed and stopped runs at once.
// Only "failed" is accepted so a stray call can't wipe completed results.
export async function deleteMyFailedJobs(req: AuthedRequest, res: Response) {
  if (req.query.stage !== "failed") {
    return res.status(400).json({ error: "Only stage=failed can be bulk-deleted." });
  }
  const jobs = await AnalysisJob.find({ requestedBy: req.userId, stage: { $in: ["failed", "cancelled"] } });
  for (const job of jobs) await removeJobData(job);
  return res.json({ deleted: jobs.length });
}

// POST /api/jobs/:id/cancel — stop a queued or running run.
export async function cancelMyJob(req: AuthedRequest, res: Response) {
  const job = await AnalysisJob.findOneAndUpdate(
    { _id: req.params.id, requestedBy: req.userId, stage: { $in: ["queued", "running"] } },
    { stage: "cancelled", completedAt: new Date(), failureReason: "Stopped by you." },
    { new: true }
  );
  if (!job) return res.status(409).json({ error: "This run isn't in progress any more." });

  // Still waiting in the queue? Take it out so it never starts.
  try {
    const queue = job.moduleType === "dispersion" ? dispersionQueue : co2AnnQueue;
    const waiting = await queue.getJobs(["waiting", "delayed", "prioritized"]);
    const entry = waiting.find((j) => j.data?.jobId === String(job._id));
    if (entry) await entry.remove();
  } catch (err) {
    console.warn("[jobs] could not remove cancelled job from queue:", err);
  }
  return res.json({ ok: true });
}
