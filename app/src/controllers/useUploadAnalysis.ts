import { useState, useCallback, useRef, useEffect } from "react";

export type UploadJobStatus = "idle" | "queued" | "running" | "complete" | "failed";

export interface JobPollResult<TResult> {
  stage: "queued" | "running" | "complete" | "failed";
  /** Epoch ms the job actually started, per the server. Used for the elapsed-time
   * display so it stays correct across a refresh/reattach instead of resetting to 0. */
  startedAt?: number;
  result?: TResult;
  error?: string;
}

export interface JobFns<TResult> {
  /** Uploads the file(s) and starts the run server-side. Returns a job id to poll. */
  submit: () => Promise<{ jobId: string }>;
  /** Checks in on a previously-submitted job. */
  poll: (jobId: string) => Promise<JobPollResult<TResult>>;
}

interface Options {
  /**
   * sessionStorage key this job's id is persisted under, so a page refresh
   * mid-run (real, given 3-10 minute analysis-team runtimes) reattaches to
   * the same job instead of losing it. Omit to disable persistence.
   */
  storageKey?: string;
  pollIntervalMs?: number;
}

/**
 * Drives an upload -> submit -> poll -> result flow.
 *
 * Both the CO2 ANN (~3 min) and dispersion (~8-10 min) analysis runs are far
 * too long for a plain synchronous request/response — a browser or proxy
 * will typically time out a held-open request well before either finishes,
 * and a refresh mid-run would lose the result outright. So this is a real
 * job: submit() kicks it off server-side and returns a jobId, then poll()
 * is called on an interval until the job resolves. jobId is persisted to
 * sessionStorage (when storageKey is given) so a refresh reattaches to the
 * in-flight job instead of starting over.
 */
export function useUploadAnalysis<TResult>(fns: JobFns<TResult>, options: Options = {}) {
  const { storageKey, pollIntervalMs = 4000 } = options;

  const [status, setStatus] = useState<UploadJobStatus>("idle");
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const jobIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fnsRef = useRef(fns);
  fnsRef.current = fns;

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPersisted = useCallback(() => {
    if (storageKey) sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  const pollOnce = useCallback(
    async (jobId: string) => {
      try {
        const outcome = await fnsRef.current.poll(jobId);
        if (outcome.startedAt) setStartedAt(outcome.startedAt);
        if (outcome.stage === "complete" && outcome.result) {
          stopPolling();
          clearPersisted();
          setResult(outcome.result);
          setStatus("complete");
        } else if (outcome.stage === "failed") {
          stopPolling();
          clearPersisted();
          setError(outcome.error ?? "Analysis failed.");
          setStatus("failed");
        } else {
          setStatus(outcome.stage);
        }
      } catch (err) {
        stopPolling();
        clearPersisted();
        setError(err instanceof Error ? err.message : "Lost contact with the analysis job.");
        setStatus("failed");
      }
    },
    [stopPolling, clearPersisted]
  );

  const beginPolling = useCallback(
    (jobId: string) => {
      jobIdRef.current = jobId;
      if (storageKey) sessionStorage.setItem(storageKey, jobId);
      stopPolling();
      timerRef.current = setInterval(() => pollOnce(jobId), pollIntervalMs);
      void pollOnce(jobId);
    },
    [pollOnce, stopPolling, pollIntervalMs, storageKey]
  );

  const run = useCallback(async () => {
    setStatus("queued");
    setError(null);
    setResult(null);
    setStartedAt(Date.now());
    try {
      const { jobId } = await fnsRef.current.submit();
      beginPolling(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the analysis.");
      setStatus("failed");
    }
  }, [beginPolling]);

  const reset = useCallback(() => {
    stopPolling();
    clearPersisted();
    jobIdRef.current = null;
    setStatus("idle");
    setResult(null);
    setError(null);
    setStartedAt(null);
  }, [stopPolling, clearPersisted]);

  // Reattach to an in-flight job on mount (e.g. after a refresh).
  useEffect(() => {
    if (!storageKey) return;
    const savedJobId = sessionStorage.getItem(storageKey);
    if (savedJobId) {
      setStatus("running");
      setStartedAt(Date.now());
      beginPolling(savedJobId);
    }
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    result,
    error,
    run,
    reset,
    startedAt,
    isRunning: status === "queued" || status === "running",
  };
}
