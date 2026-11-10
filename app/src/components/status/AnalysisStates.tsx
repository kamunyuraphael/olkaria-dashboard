import { QuerySitePreview } from "@/components/map/QuerySitePreview";
import type { Gas } from "@/models/analysis.types";

const RUN_STAGES = ["Queued", "Fetching satellite data", "Running model"];

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

export function AnalysisEmptyState({
  lat,
  lng,
  radiusKm,
  gas,
  onCoordsChange,
}: {
  lat: number;
  lng: number;
  radiusKm: number;
  gas: Gas;
  onCoordsChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <QuerySitePreview lat={lat} lng={lng} radiusKm={radiusKm} gas={gas} onCoordsChange={onCoordsChange} />
      <p className="shrink-0 text-center text-sm text-[var(--color-text-tertiary)]">
        No analysis yet — set a date range on the left, then run. Results typically take a few minutes.
      </p>
    </div>
  );
}

export function AnalysisRunningState({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-sm text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-warning-subtle)] flex items-center justify-center mx-auto mb-4">
          <span className="w-4 h-4 rounded-full border-2 border-[var(--color-warning)] border-t-transparent animate-spin" />
        </div>
        <RunStageTracker label={label} />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</h3>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">
          You can leave this page — the run continues in the background and will appear in your Results
          Library when it finishes.
        </p>
      </div>
    </div>
  );
}

export function AnalysisFailedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-sm text-center px-6">
        <ErrorIcon />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis failed</h3>
        <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">
          The run could not be completed. This often means too few valid retrievals were available for the
          selected domain and date range — try a wider buffer radius or a longer period.
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
