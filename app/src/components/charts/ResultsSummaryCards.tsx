import { Card } from "@/components/ui/Card";
import { PlaceholderBox } from "@/components/ui/PlaceholderBox";
import { MetricRow } from "@/components/charts/MetricRow";
import { annMetrics, naiveMetrics, fmt } from "@/lib/forecastMetrics";
import type { Audience, Gas } from "@/models/analysis.types";
import type { Co2AnnResult } from "@/models/co2ann.types";

const GAS_LABEL: Record<Gas, string> = { SO2: "SO₂", CH4: "CH₄", CO2: "CO₂" };

/** Pearson r of the gas against each weather covariate, as diverging bars
 * centred on zero (left = negative, right = positive). */
export function CorrelationHeatmapCard({ data, gas }: { data?: Co2AnnResult["correlations"]; gas: Gas }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Pearson correlation</h3>
      <p className="text-xs text-[var(--color-text-quaternary)] mb-4">{GAS_LABEL[gas]} against each weather covariate</p>
      {data && data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.map((c) => {
            const w = Math.min(Math.abs(c.r), 1) * 50;
            const positive = c.r >= 0;
            return (
              <div key={c.feature} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-[var(--color-text-secondary)]">{c.feature}</span>
                <div className="relative flex-1 h-4 bg-[var(--color-bg)] rounded">
                  <span className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--color-border)]" />
                  <span
                    className="absolute top-0.5 bottom-0.5 rounded-sm"
                    style={{
                      width: `${w}%`,
                      left: positive ? "50%" : `${50 - w}%`,
                      background: positive ? "var(--color-primary)" : "var(--color-warning)",
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs text-[var(--color-text-secondary)]">
                  {c.r > 0 ? "+" : ""}
                  {c.r.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <PlaceholderBox label="No correlations returned" height="h-44" />
      )}
    </Card>
  );
}

export function ModelMetricsCard({
  audience,
  data,
  unit,
}: {
  audience: Audience;
  data?: Co2AnnResult["timeSeries"];
  unit?: string;
}) {
  const m = data ? annMetrics(data) : null;
  const naive = data ? naiveMetrics(data) : null;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Model Metrics</h3>
        <span className="text-xs text-[var(--color-primary)] font-medium">ANN (LSTM-GRU)</span>
      </div>
      {m ? (
        <>
          <MetricRow label={unit ? `RMSE (${unit})` : "RMSE"} value={fmt(m.rmse)} />
          <MetricRow label={unit ? `MAE (${unit})` : "MAE"} value={fmt(m.mae)} />
          <MetricRow label="R²" value={m.r2.toFixed(2)} />
          {m.mape !== null && <MetricRow label="MAPE" value={`${m.mape.toFixed(1)}%`} />}
          <MetricRow label={unit ? `Bias (${unit})` : "Bias"} value={`${m.bias > 0 ? "+" : ""}${fmt(m.bias)}`} />
          {naive && <MetricRow label={unit ? `Reference: same as yesterday, RMSE (${unit})` : "Reference: same as yesterday, RMSE"} value={fmt(naive.rmse)} />}
          {m.r2 < 0 && (
            <p className="mt-2 text-xs text-[var(--color-warning)] leading-relaxed">
              R² below 0 means the model did worse than simply predicting the average on these days.
            </p>
          )}
          <details className="mt-3 text-xs text-[var(--color-text-tertiary)] leading-relaxed no-print">
            <summary className="cursor-pointer text-[var(--color-text-secondary)] font-medium">What do these numbers mean?</summary>
            <p className="mt-1.5"><strong>RMSE</strong> and <strong>MAE</strong> are the typical size of the forecast's error, in the same unit as the gas. Smaller is better. <strong>R²</strong> is how much of the real ups and downs the model captured: 1.0 is perfect, 0 means no better than guessing the average, and below 0 means worse than that. <strong>MAPE</strong> is the average error as a percentage of the real value. <strong>Reference</strong> is a simple yardstick: guessing that each day equals the day before. <strong>Bias</strong> shows whether the model tends to over-predict (+) or under-predict (−).</p>
          </details>
          {audience === "policy" && (
            <div className="mt-4 p-3 bg-[var(--color-primary-subtle)] rounded-lg border border-[var(--color-primary)]/20">
              <p className="text-xs text-[var(--color-primary)] leading-snug">
                {m.r2 >= 0.7
                  ? `An R² of ${m.r2.toFixed(2)} means the model explains most of the variation in observed concentration, reliable enough to support planning at this site.`
                  : m.r2 >= 0.4
                  ? `An R² of ${m.r2.toFixed(2)} means the model explains part of the variation in observed concentration. Use it as a guide, not as a sole basis for decisions.`
                  : `An R² of ${m.r2.toFixed(2)} means the model explains little of the variation in observed concentration. Treat this forecast with caution.`}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-[var(--color-text-quaternary)]">Not enough overlapping ANN and observed points to score.</p>
      )}
    </Card>
  );
}

export function DetectionFloorBanner() {
  return (
    <div className="shrink-0 px-5 py-3.5 bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/30 rounded-xl flex items-start gap-3">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
        <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M8 6v3.5" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="var(--color-danger)" />
      </svg>
      <p className="text-sm text-[var(--color-danger-text)] leading-snug">
        <span className="font-semibold">Detection floor warning: </span>
        SO₂ signal at this site is likely below the satellite detection floor. Ground-based monitoring is
        recommended for reliable measurements at this location.
      </p>
    </div>
  );
}
