import { useState } from "react";
import { useJobs } from "@/controllers/useJobs";
import { jobTitle } from "@/components/results/JobBits";
import type { JobSummary } from "@/models/jobs.types";

/** Slim bar under the header: runs in progress, and alerts when one finishes. Visible on every page. */
export function RunBanner({ onOpenJob, onOpenResults }: { onOpenJob: (j: JobSummary) => void; onOpenResults: () => void }) {
  const { counts, finished, dismissFinished } = useJobs();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const active = counts.queued + counts.running;

  if (finished.length > 0) {
    const j = finished[0];
    const ok = j.stage === "complete";
    return (
      <div className={`no-print shrink-0 px-3 sm:px-6 py-2 flex items-center gap-3 text-sm ${ok ? "bg-[var(--color-success-subtle)] text-[var(--color-success)]" : "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"}`}>
        <span className="flex-1 min-w-0 truncate">
          {ok ? "✓" : "✕"} {jobTitle(j)} {ok ? "is ready" : "failed"}
          {finished.length > 1 ? ` (+${finished.length - 1} more)` : ""}
        </span>
        <button onClick={() => { dismissFinished(); onOpenJob(j); }} className="font-semibold underline cursor-pointer shrink-0">
          {ok ? "View" : "Details"}
        </button>
        <button onClick={dismissFinished} aria-label="Dismiss" className="shrink-0 cursor-pointer text-lg leading-none">×</button>
      </div>
    );
  }

  if (active === 0) return null;
  return (
    <div className="no-print shrink-0 px-3 sm:px-6 py-2 flex items-center gap-3 text-sm bg-[var(--color-warning-subtle)] text-[var(--color-warning)]">
      <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
      <span className="flex-1 min-w-0 truncate">
        {active} run{active === 1 ? "" : "s"} in progress — you can keep working
      </span>
      {perm === "default" && (
        <button
          onClick={() => void Notification.requestPermission().then(setPerm)}
          className="hidden sm:inline font-semibold underline cursor-pointer shrink-0"
        >
          Notify me when done
        </button>
      )}
      <button onClick={onOpenResults} className="font-semibold underline cursor-pointer shrink-0">View</button>
    </div>
  );
}
