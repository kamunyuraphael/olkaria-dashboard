import type { Co2AnnResult } from "@/models/co2ann.types";

export interface ForecastMetrics {
  rmse: number;
  mae: number;
  r2: number;
  n: number;
}

/** RMSE / MAE / R² of the ANN series against observed, skipping the null
 * gaps the analysis-service leaves where the ANN's test split ran short. */
export function annMetrics(ts: Co2AnnResult["timeSeries"]): ForecastMetrics | null {
  const pairs: [number, number][] = [];
  ts.actual.forEach((a, i) => {
    const p = ts.ann[i];
    if (p !== null && p !== undefined && Number.isFinite(a) && Number.isFinite(p)) pairs.push([a, p]);
  });
  if (pairs.length < 2) return null;

  const n = pairs.length;
  const meanActual = pairs.reduce((s, [a]) => s + a, 0) / n;
  const sse = pairs.reduce((s, [a, p]) => s + (a - p) ** 2, 0);
  const sae = pairs.reduce((s, [a, p]) => s + Math.abs(a - p), 0);
  const sst = pairs.reduce((s, [a]) => s + (a - meanActual) ** 2, 0);

  return {
    rmse: Math.sqrt(sse / n),
    mae: sae / n,
    r2: sst === 0 ? 0 : 1 - sse / sst,
    n,
  };
}

/** Sensible decimals for the gas's magnitude (CH4 ~1900 ppb vs SO2 ~9). */
export function fmt(v: number): string {
  const abs = Math.abs(v);
  return abs >= 100 ? v.toFixed(1) : abs >= 10 ? v.toFixed(2) : v.toFixed(3);
}
