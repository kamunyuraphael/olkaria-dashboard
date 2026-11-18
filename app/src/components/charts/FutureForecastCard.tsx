import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/forecastMetrics";
import type { Co2AnnResult } from "@/models/co2ann.types";

const W = 720;
const H = 200;
const L = 52;
const R = 12;
const T = 12;
const B = 26;

/** Next-year ANN forecast: one line, with the headline numbers beside it. */
export function FutureForecastCard({ future, unit }: { future: NonNullable<Co2AnnResult["future"]>; unit?: string }) {
  const v = future.values;
  const n = v.length;
  if (n < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const pad = (hi - lo) * 0.1 || 1;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const y = (val: number) => T + (1 - (val - (lo - pad)) / (hi - lo + 2 * pad)) * (H - T - B);
  const path = v.map((val, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2].map((k) => lo - pad + ((hi - lo + 2 * pad) * k) / 2);
  const iMax = v.indexOf(hi);
  const iMin = v.indexOf(lo);
  const mean = v.reduce((s, a) => s + a, 0) / n;
  const u = unit ? ` ${unit}` : "";

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Next 12 months (ANN forecast)</h3>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {future.dates[0]} → {future.dates[n - 1]}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Forecast for the next year, averaging ${fmt(mean)}${u}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-border)" />
            <text x={L - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--color-text-quaternary)" fontFamily="monospace">{fmt(t)}</text>
          </g>
        ))}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10" fill="var(--color-text-quaternary)" fontFamily="monospace">{future.dates[i]}</text>
        ))}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="6 3" strokeLinejoin="round" />
      </svg>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
        {[
          ["Average", `${fmt(mean)}${u}`],
          ["Highest", `${fmt(hi)}${u} · ${future.dates[iMax]}`],
          ["Lowest", `${fmt(lo)}${u} · ${future.dates[iMin]}`],
        ].map(([k, val]) => (
          <div key={k}>
            <dt className="text-[var(--color-text-tertiary)]">{k}</dt>
            <dd className="font-mono text-[var(--color-text-primary)]">{val}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-[var(--color-text-tertiary)] leading-relaxed">
        This is a seasonal outlook, not a day-by-day prediction: it assumes weather stays at the latest observed levels, so expect the real values to vary around it.
      </p>
    </Card>
  );
}
