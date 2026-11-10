import { Worker, type Job } from "bullmq";
import { redisConnection } from "@/config/redis.js";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { Co2AnnResult } from "@/models/Co2AnnResult.model.js";
import { runCo2AnnAnalysis } from "@/services/analysisServiceClient.js";
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

      const coordinates = analysisJob.coordinates;
      if (!coordinates) throw new Error("co2-ann job is missing its coordinates");

      const output = await runCo2AnnAnalysis({
        gas: coordinates.gas ?? "CO2",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radiusKm: coordinates.radiusKm,
        startDate: coordinates.startDate ?? undefined,
        endDate: coordinates.endDate ?? undefined,
      });

      const resultDoc = await Co2AnnResult.create({
        job: analysisJob._id,
        timeSeries: output.timeSeries,
        correlations: output.correlations,
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
