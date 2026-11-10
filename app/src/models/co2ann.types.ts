// CO2 ANN module (upload-based) — see olkaria-ann-dashboard notes.

export interface Co2AnnResult {
  // "Actual vs Predicted Values Using SARIMA and ANN" — the one line chart
  // this module produces. Kept as ann+sarima here (unlike Module A's now
  // ANN-only metrics) because this pipeline was never asked to drop SARIMA.
  timeSeries: {
    dates: string[];
    actual: number[];
    // null where the ANN's own test split came up shorter than the SARIMA
    // comparison window — a gap, not a zero (see analysis-service's
    // co2_ann/pipeline.py run_co2_ann docstring).
    ann: (number | null)[];
    sarima: number[];
  };
  // Pearson correlation of CO2 with each weather covariate.
  correlations: {
    feature: string;
    r: number;
  }[];
}
