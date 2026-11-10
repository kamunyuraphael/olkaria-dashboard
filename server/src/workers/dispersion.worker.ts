import { Worker, type Job } from "bullmq";
import { redisConnection } from "@/config/redis.js";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { DispersionResult } from "@/models/DispersionResult.model.js";
import { runDispersionAnalysis } from "@/services/analysisServiceClient.js";
import type { AnalysisJobData } from "@/queue/analysisQueue.js";
import type { DispersionGas } from "@/types/domain.js";

export function startDispersionWorker() {
  return new Worker<AnalysisJobData>(
    "dispersion-analysis",
    async (job: Job<AnalysisJobData>) => {
      const analysisJob = await AnalysisJob.findById(job.data.jobId);
      if (!analysisJob) throw new Error(`AnalysisJob ${job.data.jobId} not found`);

      analysisJob.stage = "running";
      analysisJob.startedAt = new Date();
      await analysisJob.save();

      const metFile = analysisJob.inputFiles.find((f) => f.role === "metData");
      if (!metFile) throw new Error("dispersion job has no metData input file");

      const emissionSourcePaths: Partial<Record<DispersionGas, string>> = {};
      for (const f of analysisJob.inputFiles) {
        if (f.role === "CO2" || f.role === "CH4" || f.role === "H2S") {
          emissionSourcePaths[f.role] = f.storedPath;
        }
      }

      const output = await runDispersionAnalysis({
        metDataPath: metFile.storedPath,
        emissionSourcePaths,
      });

      const resultDoc = await DispersionResult.create({
        job: analysisJob._id,
        gases: output,
      });

      analysisJob.stage = "complete";
      analysisJob.completedAt = new Date();
      analysisJob.resultModel = "DispersionResult";
      analysisJob.resultRef = resultDoc._id;
      await analysisJob.save();
    },
    // AERMOD runs are the longest job in the system (~8-10 min real
    // runtime) — lower concurrency than co2-ann since each run is heavier.
    { connection: redisConnection, concurrency: 1 }
  )
    .on("failed", async (job, err) => {
      if (!job) return;
      console.error(`[dispersion-worker] job ${job.data.jobId} failed:`, err);
      await AnalysisJob.findByIdAndUpdate(job.data.jobId, {
        stage: "failed",
        failureReason: err.message,
        completedAt: new Date(),
      });
    })
    // Without this, a connection-level problem (Redis dropping the
    // blocking connection, an auth/TLS hiccup against Upstash, etc.) is
    // silently swallowed: the Worker never throws into "failed" because it
    // never even got a job to fail - it just stops polling. Jobs then sit
    // in Mongo at stage "queued" forever with zero trace anywhere. This
    // listener is what would have surfaced that instead of silence.
    .on("error", (err) => {
      console.error("[dispersion-worker] connection/runtime error:", err);
    })
    .on("active", (job) => {
      console.log(`[dispersion-worker] picked up job ${job.data.jobId}`);
    })
    .on("completed", (job) => {
      console.log(`[dispersion-worker] completed job ${job.data.jobId}`);
    });
}
