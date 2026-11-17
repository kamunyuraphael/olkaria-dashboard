import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchJobs } from "@/lib/jobsClient";
import type { JobCounts, JobSummary } from "@/models/jobs.types";

interface JobsContextValue {
  /** Runs that moved from in-progress to finished since the last time the user dismissed the alert. */
  finished: JobSummary[];
  dismissFinished: () => void;
  jobs: JobSummary[];
  counts: JobCounts;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const EMPTY: JobCounts = { total: 0, queued: 0, running: 0, complete: 0, failed: 0 };
const JobsContext = createContext<JobsContextValue | null>(null);

/** The signed-in user's runs. Refreshes itself every 10s while anything is queued/running. */
export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [counts, setCounts] = useState<JobCounts>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [finished, setFinished] = useState<JobSummary[]>([]);
  const activeIds = useRef<Set<string>>(new Set());
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetchJobs();
      if (!alive.current) return;
      // Anything we saw queued/running that is now done: tell the user.
      const done = r.jobs.filter(
        (j) => (j.stage === "complete" || j.stage === "failed") && activeIds.current.has(j.id)
      );
      if (done.length) {
        setFinished((prev) => [...done, ...prev.filter((p) => !done.some((d) => d.id === p.id))]);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const j of done) {
            new Notification(j.stage === "complete" ? "Your analysis is ready" : "An analysis failed", {
              body: j.stage === "complete" ? "Open Results to see the output." : j.error ?? "Open Results for details.",
            });
          }
        }
      }
      activeIds.current = new Set(r.jobs.filter((j) => j.stage === "queued" || j.stage === "running").map((j) => j.id));
      setJobs(r.jobs);
      setCounts(r.counts);
      setError(false);
    } catch {
      if (alive.current) setError(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  const hasActive = counts.queued + counts.running > 0;
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => void refresh(), 10000);
    return () => clearInterval(t);
  }, [hasActive, refresh]);

  const dismissFinished = useCallback(() => setFinished([]), []);
  const value = useMemo(
    () => ({ jobs, counts, loading, error, refresh, finished, dismissFinished }),
    [jobs, counts, loading, error, refresh, finished, dismissFinished]
  );
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used inside <JobsProvider>");
  return ctx;
}
