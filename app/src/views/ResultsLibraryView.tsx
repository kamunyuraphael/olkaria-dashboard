import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageShell, primaryBtn, outlineBtn, inputClass } from "@/components/ui/PageShell";
import { StagePill, jobTitle, jobSubtitle, timeAgo } from "@/components/results/JobBits";
import { AnnResults } from "@/components/results/AnnResults";
import { DispersionResults } from "@/components/results/DispersionResults";
import { useJobs } from "@/controllers/useJobs";
import { fetchStoredResult } from "@/lib/jobsClient";
import { deleteJob } from "@/lib/adminClient";
import { cancelJob, deleteFailedJobs } from "@/lib/jobsClient";
import { CompareView } from "@/components/results/CompareView";
import { ListSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Co2AnnResult } from "@/models/co2ann.types";
import type { DispersionResult } from "@/models/dispersion.types";
import type { Gas, Page } from "@/models/analysis.types";
import type { JobFilter, JobSummary } from "@/models/jobs.types";

const FILTERS: { id: JobFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "complete", label: "Completed" },
  { id: "failed", label: "Failed & stopped" },
];

function matches(job: JobSummary, f: JobFilter) {
  if (f === "all") return true;
  if (f === "active") return job.stage === "queued" || job.stage === "running";
  if (f === "failed") return job.stage === "failed" || job.stage === "cancelled";
  return job.stage === f;
}

function StoredResult({ job, onBack, onRunAgain }: { job: JobSummary; onBack: () => void; onRunAgain: () => void }) {
  const { refresh } = useJobs();
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const canDelete = job.stage === "complete" || job.stage === "failed" || job.stage === "cancelled";
  const [stopping, setStopping] = useState(false);
  const doStop = async () => {
    setStopping(true);
    try {
      await cancelJob(job.id);
    } catch {
      /* finished meanwhile */
    }
    await refresh();
    setStopping(false);
  };
  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteJob(job.id);
      await refresh();
      onBack();
    } catch (e) {
      setDelError(e instanceof Error ? e.message : "Could not delete.");
      setDeleting(false);
      setAskDelete(false);
    }
  };
  const [ann, setAnn] = useState<Co2AnnResult | null>(null);
  const [disp, setDisp] = useState<DispersionResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(job.stage === "complete");

  useEffect(() => {
    if (job.stage !== "complete") return;
    let cancelled = false;
    setLoading(true);
    fetchStoredResult(job)
      .then((r) => {
        if (cancelled) return;
        if (r.ann) setAnn(r.ann);
        else if (r.dispersion) setDisp(r.dispersion);
        else setError(r.error ?? "The stored output could not be found.");
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load this result."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [job]);

  return (
    <PageShell
      title={jobTitle(job)}
      subtitle={[jobSubtitle(job), timeAgo(job.createdAt)].filter(Boolean).join(" · ")}
      actions={
        <button onClick={onBack} className={outlineBtn}>
          ← All results
        </button>
      }
    >
      <div className="flex items-center gap-2">
        <StagePill stage={job.stage} />
        {job.module === "co2-ann" && (
          <button onClick={onRunAgain} className="ml-2 text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer">
            {job.dataSource === "satellite" ? "Run again with new settings" : "Run again with another file"}
          </button>
        )}
        {canDelete && (
          <button onClick={() => setAskDelete(true)} className="ml-auto text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] cursor-pointer">
            Delete this run
          </button>
        )}
      </div>
      {delError && <p className="text-sm text-[var(--color-danger)]">{delError}</p>}
      {askDelete && (
        <ConfirmDialog title="Delete this run?" confirmLabel="Delete" danger busy={deleting} onConfirm={doDelete} onCancel={() => setAskDelete(false)}>
          The run and its saved output are removed permanently.
        </ConfirmDialog>
      )}

      {job.stage === "failed" && (
        <Card className="p-5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <p className="font-medium text-[var(--color-danger)] mb-1">This run failed</p>
          {job.error}
        </Card>
      )}
      {(job.stage === "queued" || job.stage === "running") && (
        <Card className="p-5 text-sm text-[var(--color-text-secondary)] flex flex-wrap items-center justify-between gap-3">
          <span>This run is still in progress. It will appear here as soon as it finishes.</span>
          <button onClick={doStop} disabled={stopping} className={`${outlineBtn} !border-[var(--color-danger)] !text-[var(--color-danger)] disabled:opacity-50`}>
            {stopping ? "Stopping…" : "Stop analysis"}
          </button>
        </Card>
      )}
      {job.stage === "cancelled" && (
        <Card className="p-5 text-sm text-[var(--color-text-secondary)]">You stopped this run. Nothing was saved.</Card>
      )}
      {loading && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading stored output">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      )}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {ann && <AnnResults result={ann} gas={(job.gas ?? "CO2") as Gas} source={job.dataSource} />}
      {disp && <DispersionResults result={disp} />}
    </PageShell>
  );
}

export function ResultsLibraryView({
  filter,
  onFilterChange,
  selected,
  onSelect,
  onNavigate,
  onRunAgain,
}: {
  filter: JobFilter;
  onFilterChange: (f: JobFilter) => void;
  selected: JobSummary | null;
  onSelect: (j: JobSummary | null) => void;
  onNavigate: (p: Page) => void;
  onRunAgain: (j: JobSummary) => void;
}) {
  const { jobs, counts, loading, error, refresh } = useJobs();
  const [query, setQuery] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const failedCount = counts.failed + counts.cancelled;
  const clearFailed = async () => {
    setClearing(true);
    try {
      await deleteFailedJobs();
      await refresh();
      setAskClear(false);
    } catch (e) {
      setClearError(e instanceof Error ? e.message : "Could not delete.");
      setAskClear(false);
    } finally {
      setClearing(false);
    }
  };

  // Refresh on arrival so a just-finished run shows up.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tally: Record<JobFilter, number> = {
    all: counts.total,
    active: counts.queued + counts.running,
    complete: counts.complete,
    failed: counts.failed + counts.cancelled,
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        matches(j, filter) &&
        (!q || `${jobTitle(j)} ${jobSubtitle(j)} ${j.stage}`.toLowerCase().includes(q))
    );
  }, [jobs, filter, query]);

  const canPick = (j: JobSummary) => j.module === "co2-ann" && j.stage === "complete";
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]));
  const pickedJobs = picked.map((id) => jobs.find((j) => j.id === id)).filter(Boolean) as JobSummary[];
  if (comparing && pickedJobs.length === 2) {
    return <CompareView jobs={[pickedJobs[0], pickedJobs[1]]} onBack={() => setComparing(false)} />;
  }

  // Keep the open run fresh (e.g. opened from a notification while it was still running).
  const live = selected ? jobs.find((j) => j.id === selected.id) ?? selected : null;
  if (live) return <StoredResult job={live} onBack={() => onSelect(null)} onRunAgain={() => onRunAgain(live)} />;

  return (
    <PageShell title="Results" subtitle="Every run you've made, saved with its output">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                filter === f.id
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text-tertiary)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
              }`}
            >
              {f.label} <span className="opacity-70">{tally[f.id]}</span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search runs…"
          className={`${inputClass} sm:max-w-[240px]`}
        />
      </div>

      {counts.complete >= 2 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            onClick={() => {
              setCompareMode((m) => !m);
              setPicked([]);
            }}
            aria-pressed={compareMode}
            className={compareMode ? `${primaryBtn} !py-1.5` : `${outlineBtn} !py-1.5`}
          >
            {compareMode ? "Cancel compare" : "Compare two runs"}
          </button>
          {compareMode && (
            <>
              <span className="text-[var(--color-text-tertiary)]">Pick two completed ANN runs ({picked.length}/2)</span>
              <button disabled={picked.length !== 2} onClick={() => setComparing(true)} className={`${primaryBtn} !py-1.5 ml-auto`}>
                Compare
              </button>
            </>
          )}
        </div>
      )}
      {filter === "failed" && failedCount > 0 && (
        <div className="flex justify-end">
          <button onClick={() => setAskClear(true)} className={`${outlineBtn} !border-[var(--color-danger)] !text-[var(--color-danger)]`}>
            Delete all {failedCount} failed &amp; stopped
          </button>
        </div>
      )}
      {clearError && <p className="text-sm text-[var(--color-danger)]">{clearError}</p>}
      {askClear && (
        <ConfirmDialog title={`Delete all ${failedCount} failed & stopped runs?`} confirmLabel="Delete all" danger busy={clearing} onConfirm={clearFailed} onCancel={() => setAskClear(false)}>
          Failed and stopped runs are removed permanently. Completed results are not touched.
        </ConfirmDialog>
      )}
      {error && <p className="text-sm text-[var(--color-danger)]">Couldn't reach the server. Showing what was loaded earlier.</p>}
      {loading && jobs.length === 0 && <ListSkeleton />}

      {!loading && rows.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {jobs.length === 0 ? "No runs yet" : "Nothing matches this filter"}
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1 mb-4">
            {jobs.length === 0 ? "Finished runs are saved here automatically." : "Try another filter or clear the search."}
          </p>
          {jobs.length === 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => onNavigate("dispersion")} className={primaryBtn}>Gas dispersion</button>
              <button onClick={() => onNavigate("analysis")} className={outlineBtn}>ANN</button>
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((j) => (
          <button
            key={j.id}
            onClick={() => (compareMode ? canPick(j) && togglePick(j.id) : onSelect(j))}
            disabled={compareMode && !canPick(j)}
            aria-pressed={compareMode && canPick(j) ? picked.includes(j.id) : undefined}
            className={`text-left bg-[var(--color-surface)] border rounded-xl px-4 py-3 transition-colors cursor-pointer flex items-center justify-between gap-3 disabled:opacity-40 disabled:cursor-not-allowed ${picked.includes(j.id) ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]" : "border-[var(--color-border)] hover:border-[var(--color-primary)]"}`}
          >
            <span className="min-w-0">
              {compareMode && canPick(j) && <span className="sr-only">{picked.includes(j.id) ? "Selected: " : "Select: "}</span>}
              <span className="block text-sm font-medium text-[var(--color-text-primary)] truncate">{jobTitle(j)}</span>
              <span className="block text-xs text-[var(--color-text-quaternary)] mt-0.5 truncate">
                {[jobSubtitle(j), timeAgo(j.createdAt)].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="shrink-0 flex items-center gap-2">
              <StagePill stage={j.stage} />
              <span className="hidden sm:inline text-xs font-medium text-[var(--color-primary)]">
                {j.stage === "complete" ? "View" : "Details"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
