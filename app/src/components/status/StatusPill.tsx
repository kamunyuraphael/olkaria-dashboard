import type { LibraryRow, JobStatus } from "@/models/analysis.types";

export function StatusPill({ status }: { status: LibraryRow["status"] }) {
  const map = {
    complete: { bg: "bg-[var(--color-success-subtle)]", text: "text-[var(--color-success)]", dot: "bg-[var(--color-success)]", label: "Complete" },
    running: { bg: "bg-[var(--color-warning-subtle)]", text: "text-[var(--color-warning)]", dot: "bg-[var(--color-warning)]", label: "Running" },
    failed: { bg: "bg-[var(--color-danger-subtle)]", text: "text-[var(--color-danger)]", dot: "bg-[var(--color-danger)]", label: "Failed" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function JobPill({ job }: { job: JobStatus }) {
  if (job === "idle") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-quaternary)] text-xs font-semibold border border-[var(--color-border)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-disabled)]" />
        No run yet
      </span>
    );
  }
  if (job === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
        Failed
      </span>
    );
  }
  if (job === "complete") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-success-subtle)] text-[var(--color-success)] text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
        Complete
      </span>
    );
  }
  if (job === "queued") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-tertiary)] text-xs font-semibold border border-[var(--color-border)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-quaternary)]" />
        Queued
      </span>
    );
  }
  const label = job === "fetching" ? "Fetching satellite data" : "Running model";
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-warning-subtle)] text-[var(--color-warning)] text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />
      {label}
    </span>
  );
}
