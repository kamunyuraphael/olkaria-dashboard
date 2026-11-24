import { SATELLITE_ENABLED } from "@/lib/features";

const RUN_STAGES = SATELLITE_ENABLED ? ["Queued", "Fetching satellite data", "Running model"] : ["Queued", "Running model"];

export function ErrorIcon() {
  return (
    <div className="w-12 h-12 rounded-xl bg-[var(--color-danger-subtle)] flex items-center justify-center mx-auto mb-4">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3L20 18H2L11 3Z" stroke="var(--color-danger)" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
        <path d="M11 9v4" stroke="var(--color-danger)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="11" cy="15.5" r="0.9" fill="var(--color-danger)" />
      </svg>
    </div>
  );
}

export function RunStageTracker({ label }: { label: string }) {
  const activeIdx = Math.max(0, RUN_STAGES.indexOf(label));
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[220px] mx-auto mb-4">
      {RUN_STAGES.map((stage, i) => (
        <span
          key={stage}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i < activeIdx
              ? "bg-[var(--color-success)]"
              : i === activeIdx
              ? "bg-[var(--color-warning)]"
              : "bg-[var(--color-border)]"
          }`}
        />
      ))}
    </div>
  );
}

export function AnalysisRunningState({ label, onStop }: { label: string; onStop?: () => void }) {
  return (
    <div className="flex items-center justify-center py-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="max-w-sm text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-warning-subtle)] flex items-center justify-center mx-auto mb-4">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--color-warning)] border-t-transparent animate-spin" />
        </div>
        <RunStageTracker label={label} />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</h3>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">
          You can leave this page. The run continues in the background and will appear in Results when it finishes.
        </p>
        {onStop && (
          <button
            onClick={onStop}
            className="mt-5 px-4 py-2 border border-[var(--color-danger)] text-[var(--color-danger)] text-sm font-medium rounded-lg hover:bg-[var(--color-danger-subtle)] transition-colors cursor-pointer"
          >
            Stop analysis
          </button>
        )}
      </div>
    </div>
  );
}

export function AnalysisFailedState({
  onRetry,
  message,
  source = "satellite",
}: {
  onRetry: () => void;
  /** The reason the server gave. Shown as-is for uploads, where it says exactly what to fix. */
  message?: string | null;
  source?: "satellite" | "upload";
}) {
  return (
    <div className="flex items-center justify-center py-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="max-w-sm text-center px-6">
        <ErrorIcon />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis failed</h3>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">
          {source === "upload"
            ? message || "The file could not be used. Check it against the template and try again."
            : "The run could not be completed. This often means too few valid retrievals were available for the selected domain and date range. Try a wider buffer radius or a longer period."}
        </p>
        <button
          onClick={onRetry}
          className="mt-5 px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium rounded-lg hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function AnalysisUploadEmptyState({ requirements, onDownloadTemplate }: { requirements: string; onDownloadTemplate: () => void }) {
  return (
    <div className="flex items-center justify-center py-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="max-w-sm text-center px-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Run on your own data</h3>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">{requirements}</p>
        <button
          onClick={onDownloadTemplate}
          className="mt-5 px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium rounded-lg hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer"
        >
          Download CSV template
        </button>
      </div>
    </div>
  );
}

export function AnalysisStoppedState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center py-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="max-w-sm text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
          <span className="w-4 h-4 rounded-sm bg-[var(--color-text-quaternary)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis stopped</h3>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">
          You stopped this run. Nothing was saved. Adjust your inputs and run it again whenever you like.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-5 px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium rounded-lg hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer"
          >
            Run again
          </button>
        )}
      </div>
    </div>
  );
}
