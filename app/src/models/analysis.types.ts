export type Audience = "researcher" | "policy";
// CO2 merged into Module A (coordinate + buffer-radius input, no uploads) —
// it's a third gas option alongside SO2/CH4, not a separate module anymore.
export type Gas = "SO2" | "CH4" | "CO2";
export type Page = "overview" | "analysis" | "dispersion" | "library" | "settings" | "admin" | "help";

export type JobStatus = "idle" | "queued" | "fetching" | "running" | "complete" | "failed" | "cancelled";

export const JOB_SEQUENCE: JobStatus[] = ["queued", "fetching", "running", "complete"];

export interface LibraryRow {
  id: string;
  site: string;
  gas: Gas;
  start: string;
  end: string;
  status: "complete" | "running" | "failed";
  coverage: string;
}

export interface AnalysisQueryParams {
  lat: number;
  lng: number;
  radiusKm: number;
  gas: Gas;
  startDate: string;
  endDate: string;
}
