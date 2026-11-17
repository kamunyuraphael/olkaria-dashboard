import type { Gas } from "@/models/analysis.types";

export type JobStage = "queued" | "running" | "complete" | "failed";
export type JobModule = "co2-ann" | "dispersion";

export interface JobSummary {
  id: string;
  module: JobModule;
  stage: JobStage;
  dataSource: "satellite" | "upload";
  gas?: Gas;
  /** Dispersion runs: gas keys that were submitted (CO2 / CH4 / H2S). */
  gases: string[];
  label?: string;
  coordinates?: { latitude: number; longitude: number; radiusKm: number; startDate?: string; endDate?: string };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface JobCounts {
  total: number;
  queued: number;
  running: number;
  complete: number;
  failed: number;
}

/** Filter used by the Results page; "active" = queued + running. */
export type JobFilter = "all" | "active" | "complete" | "failed";
