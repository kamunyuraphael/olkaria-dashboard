import type { Co2AnnResult } from "@/models/co2ann.types";

export interface ForecastMetrics {
  rmse: number;
  mae: number;
  r2: number;
  /** Mean absolute % error; null when observed values include zeros. */
  mape: number | null;
  /** Mean signed error (forecast − observed): >0 over-predicts. */
  bias: number;
  n: number;
}

/** RMSE / MAE / R² of the ANN series against observed, skipping the null
 * gaps the analysis-service leaves where the ANN's test split ran short. */
export function annMetrics(ts: Co2AnnResult["timeSeries"], model: "ann" | "sarima" = "ann"): ForecastMetrics | null {
  const pairs: [number, number][] = [];
  ts.actual.forEach((a, i) => {
    const p = ts[model][i];
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
    mape: pairs.some(([a]) => a === 0) ? null : (pairs.reduce((s, [a, p]) => s + Math.abs((a - p) / a), 0) / n) * 100,
    bias: pairs.reduce((s, [a, p]) => s + (p - a), 0) / n,
    n,
  };
}

/** Yardstick: guess each day equals the previous day's reading. It needs the
 * day before, so it is scored on every day but the first. Computed here from
 * the observed series, so it works for stored runs too. */
export function naiveMetrics(ts: Co2AnnResult["timeSeries"]): ForecastMetrics | null {
  const prev = { ...ts, ann: ts.actual.map((_, i) => (i === 0 ? null : ts.actual[i - 1])) };
  return annMetrics(prev as Co2AnnResult["timeSeries"], "ann");
}

/** Sensible decimals for the gas's magnitude (CH4 ~1900 ppb vs SO2 ~9). */
export function fmt(v: number): string {
  const abs = Math.abs(v);
  return abs >= 100 ? v.toFixed(1) : abs >= 10 ? v.toFixed(2) : v.toFixed(3);
}
