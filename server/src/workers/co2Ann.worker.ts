import { Worker, UnrecoverableError, type Job } from "bullmq";
import { redisConnection } from "@/config/redis.js";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { Co2AnnResult } from "@/models/Co2AnnResult.model.js";
import { AnalysisValidationError, runCo2AnnAnalysis, runCo2AnnUploadAnalysis } from "@/services/analysisServiceClient.js";
import { JobCancelledError, withCancelWatch } from "@/services/cancel.service.js";
import type { AnalysisJobData } from "@/queue/analysisQueue.js";

export function startCo2AnnWorker() {
  return new Worker<AnalysisJobData>(
    "co2-ann-analysis",
    async (job: Job<AnalysisJobData>) => {
      const analysisJob = await AnalysisJob.findById(job.data.jobId);
      if (!analysisJob) throw new Error(`AnalysisJob ${job.data.jobId} not found`);

      // Stopped while it was still waiting in the queue.
      if (analysisJob.stage === "cancelled") return;

      // Atomic so a Stop that lands between the load above and this write isn't overwritten.
      const started = await AnalysisJob.findOneAndUpdate(
        { _id: analysisJob._id, stage: { $ne: "cancelled" } },
        { stage: "running", startedAt: new Date() }
      );
      if (!started) return;

      let output;
      if (analysisJob.dataSource === "upload") {
        const dataFile = analysisJob.inputFiles.find((f) => f.role === "data");
        if (!dataFile || !analysisJob.gas) throw new Error("upload job is missing its data file or gas");
        try {
          output = await withCancelWatch(job.data.jobId, (signal) =>
            runCo2AnnUploadAnalysis({ gas: analysisJob.gas!, filePath: dataFile.storedPath }, signal)
          );
        } catch (err) {
          // A bad file (missing column, monthly data, too short...) fails the
          // same way every time - skip BullMQ's retries so the user sees the
          // reason immediately instead of after the backoff delay.
          if (err instanceof JobCancelledError) throw new UnrecoverableError(err.message);
          if (err instanceof AnalysisValidationError) throw new UnrecoverableError(err.message);
          throw err;
        }
      } else {
        const coordinates = analysisJob.coordinates;
        if (!coordinates) throw new Error("co2-ann job is missing its coordinates");
        try {
          output = await withCancelWatch(job.data.jobId, (signal) =>
            runCo2AnnAnalysis(
              {
                gas: coordinates.gas ?? "CO2",
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                radiusKm: coordinates.radiusKm,
                startDate: coordinates.startDate ?? undefined,
                endDate: coordinates.endDate ?? undefined,
              },
              signal
            )
          );
        } catch (err) {
          if (err instanceof JobCancelledError) throw new UnrecoverableError(err.message);
          throw err;
        }
      }

      const resultDoc = await Co2AnnResult.create({
        job: analysisJob._id,
        timeSeries: output.timeSeries,
        correlations: output.correlations,
        future: output.future,
        // Provenance: what the analysis-service did to the data, plus the
        // user's own label for it.
        meta: { ...(output.meta ?? {}), ...(analysisJob.siteLabel ? { label: analysisJob.siteLabel } : {}) },
      });

      // The user may have pressed Stop right as the result arrived.
      const done = await AnalysisJob.findOneAndUpdate(
        { _id: analysisJob._id, stage: { $ne: "cancelled" } },
        { stage: "complete", completedAt: new Date(), resultModel: "Co2AnnResult", resultRef: resultDoc._id }
      );
      if (!done) await Co2AnnResult.deleteOne({ _id: resultDoc._id });
    },
    { connection: redisConnection, concurrency: 2 }
  )
    .on("failed", async (job, err) => {
      if (!job) return;
      console.error(`[co2-ann-worker] job ${job.data.jobId} failed:`, err);
      // A stop is not a failure: leave the job marked "cancelled".
      await AnalysisJob.findOneAndUpdate({ _id: job.data.jobId, stage: { $ne: "cancelled" } }, {
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
