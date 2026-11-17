import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageShell, primaryBtn, outlineBtn, inputClass } from "@/components/ui/PageShell";
import { StagePill, jobTitle, jobSubtitle, timeAgo } from "@/components/results/JobBits";
import { AnnResults } from "@/components/results/AnnResults";
import { DispersionResults } from "@/components/results/DispersionResults";
import { useJobs } from "@/controllers/useJobs";
import { fetchStoredResult } from "@/lib/jobsClient";
import { deleteJob } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Co2AnnResult } from "@/models/co2ann.types";
import type { DispersionResult } from "@/models/dispersion.types";
import type { Gas, Page } from "@/models/analysis.types";
import type { JobFilter, JobSummary } from "@/models/jobs.types";

const FILTERS: { id: JobFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "complete", label: "Completed" },
  { id: "failed", label: "Failed" },
];

function matches(job: JobSummary, f: JobFilter) {
  if (f === "all") return true;
  if (f === "active") return job.stage === "queued" || job.stage === "running";
  return job.stage === f;
}

function StoredResult({ job, onBack }: { job: JobSummary; onBack: () => void }) {
  const { refresh } = useJobs();
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const canDelete = job.stage === "complete" || job.stage === "failed";
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
        <Card className="p-5 text-sm text-[var(--color-text-secondary)]">
          This run is still in progress. It will appear here as soon as it finishes.
        </Card>
      )}
      {loading && <p className="text-sm text-[var(--color-text-quaternary)]">Loading stored output…</p>}
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
}: {
  filter: JobFilter;
  onFilterChange: (f: JobFilter) => void;
  selected: JobSummary | null;
  onSelect: (j: JobSummary | null) => void;
  onNavigate: (p: Page) => void;
}) {
  const { jobs, counts, loading, error, refresh } = useJobs();
  const [query, setQuery] = useState("");

  // Refresh on arrival so a just-finished run shows up.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tally: Record<JobFilter, number> = {
    all: counts.total,
    active: counts.queued + counts.running,
    complete: counts.complete,
    failed: counts.failed,
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        matches(j, filter) &&
        (!q || `${jobTitle(j)} ${jobSubtitle(j)} ${j.stage}`.toLowerCase().includes(q))
    );
  }, [jobs, filter, query]);

  // Keep the open run fresh (e.g. opened from a notification while it was still running).
  const live = selected ? jobs.find((j) => j.id === selected.id) ?? selected : null;
  if (live) return <StoredResult job={live} onBack={() => onSelect(null)} />;

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

      {error && <p className="text-sm text-[var(--color-danger)]">Couldn't reach the server — showing what was loaded earlier.</p>}
      {loading && jobs.length === 0 && <p className="text-sm text-[var(--color-text-quaternary)]">Loading…</p>}

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
            onClick={() => onSelect(j)}
            className="text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-[var(--color-primary)] transition-colors cursor-pointer flex items-center justify-between gap-3"
          >
            <span className="min-w-0">
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
