import { Queue } from "bullmq";
import { redisConnection } from "@/config/redis.js";

/**
 * One BullMQ queue per module. Job data is just the Mongo AnalysisJob id —
 * the worker loads everything else (input file paths, etc.) from that
 * document, so the queue payload stays tiny and the Mongo doc stays the
 * single source of truth for status.
 */
export interface AnalysisJobData {
  jobId: string; // AnalysisJob _id
}

const defaultJobOptions = {
  attempts: 2,
  backoff: { type: "exponential" as const, delay: 15_000 },
  removeOnComplete: { age: 60 * 60 * 24 * 7 }, // keep 7 days for debugging
  removeOnFail: { age: 60 * 60 * 24 * 30 },
};

export const co2AnnQueue = new Queue<AnalysisJobData>("co2-ann-analysis", {
  connection: redisConnection,
  defaultJobOptions,
});

export const dispersionQueue = new Queue<AnalysisJobData>("dispersion-analysis", {
  connection: redisConnection,
  defaultJobOptions,
});
