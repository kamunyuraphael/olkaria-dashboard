import { Worker, UnrecoverableError, type Job } from "bullmq";
import { redisConnection } from "@/config/redis.js";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { Co2AnnResult } from "@/models/Co2AnnResult.model.js";
import { AnalysisValidationError, runCo2AnnAnalysis, runCo2AnnUploadAnalysis } from "@/services/analysisServiceClient.js";
import type { AnalysisJobData } from "@/queue/analysisQueue.js";

export function startCo2AnnWorker() {
  return new Worker<AnalysisJobData>(
    "co2-ann-analysis",
    async (job: Job<AnalysisJobData>) => {
      const analysisJob = await AnalysisJob.findById(job.data.jobId);
      if (!analysisJob) throw new Error(`AnalysisJob ${job.data.jobId} not found`);

      analysisJob.stage = "running";
      analysisJob.startedAt = new Date();
      await analysisJob.save();

      let output;
      if (analysisJob.dataSource === "upload") {
        const dataFile = analysisJob.inputFiles.find((f) => f.role === "data");
        if (!dataFile || !analysisJob.gas) throw new Error("upload job is missing its data file or gas");
        try {
          output = await runCo2AnnUploadAnalysis({ gas: analysisJob.gas, filePath: dataFile.storedPath });
        } catch (err) {
          // A bad file (missing column, monthly data, too short...) fails the
          // same way every time - skip BullMQ's retries so the user sees the
          // reason immediately instead of after the backoff delay.
          if (err instanceof AnalysisValidationError) throw new UnrecoverableError(err.message);
          throw err;
        }
      } else {
        const coordinates = analysisJob.coordinates;
        if (!coordinates) throw new Error("co2-ann job is missing its coordinates");
        output = await runCo2AnnAnalysis({
          gas: coordinates.gas ?? "CO2",
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radiusKm: coordinates.radiusKm,
          startDate: coordinates.startDate ?? undefined,
          endDate: coordinates.endDate ?? undefined,
        });
      }

      const resultDoc = await Co2AnnResult.create({
        job: analysisJob._id,
        timeSeries: output.timeSeries,
        correlations: output.correlations,
        // Provenance: what the analysis-service did to the data, plus the
        // user's own label for it.
        meta: { ...(output.meta ?? {}), ...(analysisJob.siteLabel ? { label: analysisJob.siteLabel } : {}) },
      });

      analysisJob.stage = "complete";
      analysisJob.completedAt = new Date();
      analysisJob.resultModel = "Co2AnnResult";
      analysisJob.resultRef = resultDoc._id;
      await analysisJob.save();
    },
    { connection: redisConnection, concurrency: 2 }
  )
    .on("failed", async (job, err) => {
      if (!job) return;
      console.error(`[co2-ann-worker] job ${job.data.jobId} failed:`, err);
      await AnalysisJob.findByIdAndUpdate(job.data.jobId, {
        stage: "failed",
        failureReason: err.message,
        completedAt: new Date(),
      });
    })
    .on("error", (err) => {
      console.error("[co2-ann-worker] connection/runtime error:", err);
    })
    .on("active", (job) => {
      console.log(`[co2-ann-worker] picked up job ${job.data.jobId}`);
    })
    .on("completed", (job) => {
      console.log(`[co2-ann-worker] completed job ${job.data.jobId}`);
    });
}
