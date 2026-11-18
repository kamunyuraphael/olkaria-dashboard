import { useState, useEffect, useCallback, useRef } from "react";
import type { JobStatus, AnalysisQueryParams } from "@/models/analysis.types";
import type { Co2AnnResult } from "@/models/co2ann.types";
import type { Gas } from "@/models/analysis.types";
import { cancelJob } from "@/lib/jobsClient";
import { submitCo2AnnAnalysis, submitCo2AnnUpload, pollCo2AnnAnalysis } from "@/lib/co2annClient";

/** What a run is fed from: satellite coordinates, or one uploaded data file. */
export type AnalysisInput =
  | { kind: "satellite"; params: AnalysisQueryParams }
  | { kind: "upload"; gas: Gas; file: File; label?: string };

/**
 * Owns the analysis job lifecycle for Module A (SO2/CH4/CO2).
 *
 * All three gases now go through the same real submit -> poll job
 * (co2annClient.ts -> server's /api/co2-ann/* -> analysis-service's
 * LSTM-GRU + SARIMA pipeline, fed by satellite data fetched from
 * coordinates + a buffer radius). The earlier timer-driven SO2/CH4
 * simulation is gone. The server only reports queued/running/complete/
 * failed, so the intermediate "fetching" status is no longer produced.
 */
export function useAnalysisJob() {
  const [status, setStatus] = useState<JobStatus>("idle");
  const [result, setResult] = useState<Co2AnnResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastInputRef = useRef<AnalysisInput | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(
    async (jobId: string) => {
      try {
        const outcome = await pollCo2AnnAnalysis(jobId);
        if (outcome.stage === "complete" && outcome.result) {
          stopPolling();
          setResult(outcome.result);
          setStatus("complete");
        } else if (outcome.stage === "cancelled") {
          stopPolling();
          setStatus("cancelled");
        } else if (outcome.stage === "failed") {
          stopPolling();
          setError(outcome.error ?? "Analysis failed.");
          setStatus("failed");
        } else {
          setStatus(outcome.stage === "queued" ? "queued" : "running");
        }
      } catch (err) {
        stopPolling();
        setError(err instanceof Error ? err.message : "Lost contact with the analysis job.");
        setStatus("failed");
      }
    },
    [stopPolling]
  );

  const runAnalysis = useCallback(
    (input?: AnalysisInput) => {
      if (status === "queued" || status === "fetching" || status === "running") return;
      const run = input ?? lastInputRef.current;
      if (!run) return;
      lastInputRef.current = run;

      stopPolling();
      setError(null);
      setResult(null);
      setStatus("queued");

      (async () => {
        try {
          const { jobId } =
            run.kind === "upload"
              ? await submitCo2AnnUpload({ gas: run.gas, file: run.file, label: run.label })
              : await submitCo2AnnAnalysis({
                  gas: run.params.gas,
                  latitude: run.params.lat,
                  longitude: run.params.lng,
                  radiusKm: run.params.radiusKm,
                  startDate: run.params.startDate,
                  endDate: run.params.endDate,
                });
          jobIdRef.current = jobId;
          pollTimerRef.current = setInterval(() => pollOnce(jobId), 2000);
          void pollOnce(jobId);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not start the analysis.");
          setStatus("failed");
        }
      })();
    },
    [status, pollOnce, stopPolling]
  );

  /** Stops the run on the server; the UI flips to "cancelled" right away. */
  const cancel = useCallback(async () => {
    const id = jobIdRef.current;
    if (!id) return;
    try {
      await cancelJob(id);
    } catch {
      /* already finished: the next poll shows the real state */
    }
    void pollOnce(id);
  }, [pollOnce]);

  useEffect(() => stopPolling, [stopPolling]);

  const isRunning = status === "queued" || status === "fetching" || status === "running";

  return { status, isRunning, result, error, runAnalysis, cancel };
}
