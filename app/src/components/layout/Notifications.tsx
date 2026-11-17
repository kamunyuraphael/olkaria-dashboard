import { useEffect, useRef, useState } from "react";
import { useJobs } from "@/controllers/useJobs";
import { StagePill, jobTitle, jobSubtitle, timeAgo } from "@/components/results/JobBits";
import type { JobSummary } from "@/models/jobs.types";

/** Bell with recent run activity (this is where "recent work" lives now). */
export function Notifications({ onOpenJob, onSeeAll }: { onOpenJob: (job: JobSummary) => void; onSeeAll: () => void }) {
  const { jobs, counts } = useJobs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = counts.queued + counts.running;
  const recent = jobs.slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Recent activity"
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
      >
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
          <path d="M4 13.5h10l-1.2-1.6V8a3.8 3.8 0 10-7.6 0v3.9L4 13.5zM7.5 15.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {active > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[var(--color-warning)] text-white text-[9px] font-bold flex items-center justify-center">
            {active}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-auto sm:mt-2 sm:w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Recent activity</p>
            {active > 0 && <span className="text-xs text-[var(--color-warning)]">{active} in progress</span>}
          </div>
          {recent.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-text-quaternary)] text-center">No runs yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">
              {recent.map((j) => (
                <li key={j.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onOpenJob(j);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-bg)] cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{jobTitle(j)}</span>
                      <StagePill stage={j.stage} />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-quaternary)] mt-0.5 truncate">
                      {[jobSubtitle(j), timeAgo(j.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => {
              setOpen(false);
              onSeeAll();
            }}
            className="w-full px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] border-t border-[var(--color-border)] hover:bg-[var(--color-bg)] cursor-pointer"
          >
            See all results
          </button>
        </div>
      )}
    </div>
  );
}
