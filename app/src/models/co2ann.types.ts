// ANN module result types (satellite or uploaded data).

export interface Co2AnnResult {
  // "Actual vs Predicted Values Using SARIMA and ANN" - the one line chart
  // this module produces. Kept as ann+sarima here (unlike Module A's now
  // ANN-only metrics) because this pipeline was never asked to drop SARIMA.
  timeSeries: {
    dates: string[];
    actual: number[];
    // null where the ANN's own test split came up shorter than the SARIMA
    // comparison window - a gap, not a zero (see analysis-service's
    // co2_ann/pipeline.py run_co2_ann docstring).
    ann: (number | null)[];
    sarima: number[];
  };
  // Pearson correlation of CO2 with each weather covariate.
  correlations: {
    feature: string;
    r: number;
  }[];
  /** One-year-ahead ANN forecast (daily). Absent on older results. */
  future?: { dates: string[]; values: number[] };
  // Provenance + data-prep notes from the analysis-service. Absent on
  // results saved before uploads existed (those were all satellite runs).
  meta?: Co2AnnMeta;
}

export interface Co2AnnMeta {
  source?: "satellite" | "upload";
  gas?: string;
  /** Site/dataset label the user typed on an upload run. */
  label?: string;
  rows?: number;
  startDate?: string;
  endDate?: string;
  /** Upload runs: "daily" | "sub-daily" (what the file's timestamps looked like). */
  detectedStep?: string;
  /** Upload runs: finer-than-daily data was averaged to daily. */
  resampledToDaily?: boolean;
  /** Upload runs: days with no gas reading that were filled by interpolation. */
  filledDays?: number;
  /** Upload runs: how numeric dates were read ("day-first-assumed" means the file never settled it). */
  dateOrder?: string;
  /** How the ANN was scored: on the last `window` days, date-aligned with SARIMA. */
  annEvaluation?: { window: number; annInSample: boolean; annBiasCorrected: boolean };
  /** Server had no analysis-service configured, so this is simulated output. */
  simulated?: boolean;
}
