import { Card } from "@/components/ui/Card";
import { PageShell, primaryBtn, outlineBtn } from "@/components/ui/PageShell";
import { LocationMap } from "@/components/map/LocationMap";
import { useAuth } from "@/controllers/useAuth";
import { useJobs } from "@/controllers/useJobs";
import type { Page } from "@/models/analysis.types";
import type { JobFilter } from "@/models/jobs.types";

function StatTile({
  label,
  value,
  tone,
  hint,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  hint: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] hover:shadow-sm active:scale-[0.99] transition cursor-pointer"
    >
      <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{label}</p>
      <p className={`text-3xl font-semibold mt-1 ${tone}`}>{loading ? <span className="inline-block h-8 w-8 rounded bg-[var(--color-border)]/60 animate-pulse align-middle" /> : value}</p>
      <p className="text-[11px] text-[var(--color-text-quaternary)] mt-1">{hint} →</p>
    </button>
  );
}

export function OverviewView({
  onNavigate,
  onOpenResults,
}: {
  onNavigate: (p: Page) => void;
  onOpenResults: (f: JobFilter) => void;
}) {
  const { user } = useAuth();
  const { counts, loading } = useJobs();
  const home = user?.defaultLocation;
  const active = counts.queued + counts.running;
  const first = user?.name?.split(" ")[0];

  return (
    <PageShell title={first ? `Welcome, ${first}` : "Welcome"} subtitle="Start a new analysis or pick up where you left off">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total requests" value={counts.total} tone="text-[var(--color-text-primary)]" hint="All results" loading={loading} onClick={() => onOpenResults("all")} />
        <StatTile label="In progress" value={active} tone="text-[var(--color-warning)]" hint="Running now" loading={loading} onClick={() => onOpenResults("active")} />
        <StatTile label="Completed" value={counts.complete} tone="text-[var(--color-success)]" hint="View outputs" loading={loading} onClick={() => onOpenResults("complete")} />
        <StatTile label="Failed" value={counts.failed + counts.cancelled} tone="text-[var(--color-danger)]" hint="Failed or stopped" loading={loading} onClick={() => onOpenResults("failed")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 sm:p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Gas dispersion</h3>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1 mb-4 leading-relaxed">
            Upload weather and emission-source data for one gas and map how it spreads around your site.
          </p>
          <button onClick={() => onNavigate("dispersion")} className={`${primaryBtn} mt-auto self-start`}>
            Upload data
          </button>
        </Card>
        <Card className="p-4 sm:p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">ANN forecast</h3>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1 mb-4 leading-relaxed">
            Upload a file of your daily readings and forecast CO₂ with the ANN, compared against a SARIMA baseline.
          </p>
          <button onClick={() => onNavigate("analysis")} className={`${primaryBtn} mt-auto self-start`}>
            Start ANN run
          </button>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Your default location</h3>
            <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5 truncate">
              {home
                ? `${home.label ? home.label + " · " : ""}${home.latitude.toFixed(4)}°, ${home.longitude.toFixed(4)}°`
                : "Not set. New ANN runs start from a generic point"}
            </p>
          </div>
          <button onClick={() => onNavigate("settings")} className={`${outlineBtn} shrink-0 !py-1.5`}>
            {home ? "Change" : "Set location"}
          </button>
        </div>
        {home ? (
          <LocationMap lat={home.latitude} lng={home.longitude} className="h-48 sm:h-60" />
        ) : (
          <p className="text-sm text-[var(--color-text-tertiary)] leading-relaxed">
            Save where you work and the ANN page will open with those coordinates ready to go.
          </p>
        )}
      </Card>
    </PageShell>
  );
}
