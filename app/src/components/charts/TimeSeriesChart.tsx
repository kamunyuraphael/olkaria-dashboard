import { Card } from "@/components/ui/Card";
import { PlaceholderBox } from "@/components/ui/PlaceholderBox";
import { fmt } from "@/lib/forecastMetrics";
import type { Co2AnnResult } from "@/models/co2ann.types";

const WIDTH = 720;
const HEIGHT = 240;
const PAD_LEFT = 52;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

type Series = (number | null)[];

function buildPath(values: Series, x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let pen = false; // null breaks the line into a gap instead of drawing to zero
  values.forEach((v, i) => {
    if (v === null || v === undefined || !Number.isFinite(v)) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

function Chart({ ts, unit }: { ts: Co2AnnResult["timeSeries"]; unit?: string }) {
  const n = ts.dates.length;
  const all = [...ts.actual, ...ts.ann, ...ts.sarima].filter(
    (v): v is number => v !== null && Number.isFinite(v)
  );
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const x = (i: number) => PAD_LEFT + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);
  const y = (v: number) => PAD_TOP + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H;

  const yTicks = [0, 1, 2, 3].map((k) => yMin + ((yMax - yMin) * k) / 3);
  const xTickIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 3), Math.floor(((n - 1) * 2) / 3), n - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label="Actual versus predicted concentration">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth="1" />
          <text x={PAD_LEFT - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--color-text-quaternary)" fontFamily="monospace">
            {fmt(t)}
          </text>
        </g>
      ))}
      {xTickIdx.map((i) => (
        <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10" fill="var(--color-text-quaternary)" fontFamily="monospace">
          {ts.dates[i]}
        </text>
      ))}
      <path d={buildPath(ts.sarima, x, y)} fill="none" stroke="var(--color-warning)" strokeWidth="1.8" strokeDasharray="1 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={buildPath(ts.actual, x, y)} fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />
      <path d={buildPath(ts.ann, x, y)} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
      {unit && (
        <text x={PAD_LEFT} y={PAD_TOP - 2} fontSize="10" fill="var(--color-text-quaternary)">{unit}</text>
      )}
    </svg>
  );
}

export function TimeSeriesChart({
  data,
  unit,
  onExport,
}: {
  data?: Co2AnnResult["timeSeries"];
  unit?: string;
  onExport?: () => void;
}) {
  return (
    <Card className="p-4 sm:p-5 shrink-0">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Actual vs. Predicted Concentration</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-[var(--color-primary)] rounded" />
              ANN (LSTM-GRU)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0 border-t-2 border-dotted border-[var(--color-warning)]" />
              SARIMA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-[var(--color-text-tertiary)]" />
              Observed
            </span>
          </div>
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-medium hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer"
            >
              Save image
            </button>
          )}
        </div>
      </div>
      {data && data.dates.length > 0 ? (
        <div data-chart>
          <Chart ts={data} unit={unit} />
        </div>
      ) : (
        <PlaceholderBox label="No time series returned" height="h-56" />
      )}
    </Card>
  );
}
