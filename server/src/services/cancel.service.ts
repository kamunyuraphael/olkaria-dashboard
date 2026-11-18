import { AnalysisJob } from "@/models/AnalysisJob.model.js";

/** Thrown inside a worker when the user pressed Stop. Not retried, not recorded as a failure. */
export class JobCancelledError extends Error {
  constructor() {
    super("Stopped by you.");
    this.name = "JobCancelledError";
  }
}

export async function isCancelled(jobId: string): Promise<boolean> {
  const j = await AnalysisJob.findById(jobId).select("stage");
  return !j || j.stage === "cancelled";
}

/**
 * Runs `fn` with an AbortSignal that fires as soon as the job is marked
 * cancelled in Mongo (checked every 2s). The in-flight request to the
 * analysis-service is dropped, so the worker is freed immediately.
 */
export async function withCancelWatch<T>(jobId: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setInterval(() => {
    void isCancelled(jobId).then((c) => c && ctrl.abort()).catch(() => undefined);
  }, 2000);
  try {
    return await fn(ctrl.signal);
  } catch (err) {
    if (ctrl.signal.aborted || (await isCancelled(jobId))) throw new JobCancelledError();
    throw err;
  } finally {
    clearInterval(timer);
  }
}
