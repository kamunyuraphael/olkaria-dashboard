import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageShell, outlineBtn } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { jobSubtitle, jobTitle, gasLabel } from "@/components/results/JobBits";
import { fetchStoredResult } from "@/lib/jobsClient";
import { annMetrics, fmt } from "@/lib/forecastMetrics";
import type { Co2AnnResult } from "@/models/co2ann.types";
import type { JobSummary } from "@/models/jobs.types";

const UNIT = { SO2: "µg/m³", CH4: "ppb", CO2: "ppm" } as const;

type Loaded = { job: JobSummary; result: Co2AnnResult };

/** Two finished ANN runs side by side: key numbers first, then each chart. */
export function CompareView({ jobs, onBack }: { jobs: [JobSummary, JobSummary]; onBack: () => void }) {
  const [data, setData] = useState<Loaded[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(jobs.map((j) => fetchStoredResult(j)))
      .then((rs) => {
        if (cancelled) return;
        if (rs.some((r) => !r.ann)) setError("One of the outputs could not be loaded.");
        else setData(jobs.map((job, i) => ({ job, result: rs[i].ann! })));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the runs."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs[0].id, jobs[1].id]);

  const better = (a: number | undefined, b: number | undefined, lowerIsBetter: boolean) =>
    a === undefined || b === undefined || a === b ? null : (a < b) === lowerIsBetter ? 0 : 1;

  return (
    <PageShell
      title="Compare runs"
      subtitle="Same-gas comparisons are the most meaningful — units and ranges match"
      wide
      actions={<button onClick={onBack} className={outlineBtn}>← Back to results</button>}
    >
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {!data && !error && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      )}
      {data && (() => {
        const m = data.map((d) => ({ ann: annMetrics(d.result.timeSeries), sar: annMetrics(d.result.timeSeries, "sarima") }));
        const rows: { label: string; vals: (number | undefined)[]; lower: boolean; show?: (v: number) => string }[] = [
          { label: "ANN RMSE", vals: m.map((x) => x.ann?.rmse), lower: true },
          { label: "ANN MAE", vals: m.map((x) => x.ann?.mae), lower: true },
          { label: "ANN MAPE (%)", vals: m.map((x) => x.ann?.mape ?? undefined), lower: true, show: (v) => v.toFixed(1) },
          { label: "ANN R²", vals: m.map((x) => x.ann?.r2), lower: false, show: (v) => v.toFixed(3) },
          { label: "SARIMA RMSE", vals: m.map((x) => x.sar?.rmse), lower: true },
          { label: "SARIMA R²", vals: m.map((x) => x.sar?.r2), lower: false, show: (v) => v.toFixed(3) },
          { label: "Test days", vals: m.map((x) => x.ann?.n), lower: false, show: (v) => String(v) },
        ];
        return (
          <>
            <Card className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <caption className="sr-only">Metrics for the two selected runs</caption>
                <thead>
                  <tr className="text-left text-xs text-[var(--color-text-tertiary)] border-b border-[var(--color-border)]">
                    <th scope="col" className="px-4 py-3 font-medium">Metric</th>
                    {data.map((d) => (
                      <th key={d.job.id} scope="col" className="px-4 py-3 font-medium">
                        <span className="block text-[var(--color-text-primary)]">{jobTitle(d.job)}</span>
                        <span className="block font-normal truncate max-w-[220px]">{jobSubtitle(d.job)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const win = r.label === "Test days" ? null : better(r.vals[0], r.vals[1], r.lower);
                    return (
                      <tr key={r.label} className="border-b last:border-0 border-[var(--color-border)]">
                        <th scope="row" className="px-4 py-2.5 text-left font-medium text-[var(--color-text-secondary)]">{r.label}</th>
                        {r.vals.map((v, i) => (
                          <td key={i} className={`px-4 py-2.5 font-mono ${win === i ? "text-[var(--color-success)] font-semibold" : "text-[var(--color-text-primary)]"}`}>
                            {v === undefined ? "–" : (r.show ?? fmt)(v)}
                            {win === i && <span className="sr-only"> (better)</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
            {data[0].job.gas !== data[1].job.gas && (
              <p className="text-xs text-[var(--color-warning)]">
                These runs are for different gases ({gasLabel(data[0].job.gas ?? "CO2")} vs {gasLabel(data[1].job.gas ?? "CO2")}) — compare the shape of the fit, not the values.
              </p>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data.map((d) => (
                <div key={d.job.id} className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">{jobTitle(d.job)} · {jobSubtitle(d.job)}</p>
                  <TimeSeriesChart data={d.result.timeSeries} unit={d.job.dataSource === "upload" ? undefined : UNIT[(d.job.gas ?? "CO2") as keyof typeof UNIT]} />
                </div>
              ))}
            </div>
          </>
        );
      })()}
    </PageShell>
  );
}
