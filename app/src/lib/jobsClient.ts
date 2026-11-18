import { apiGet, apiPostJson } from "@/lib/apiClient";
import type { Co2AnnResult } from "@/models/co2ann.types";
import type { DispersionResult } from "@/models/dispersion.types";
import type { JobSummary, JobCounts } from "@/models/jobs.types";

export async function fetchJobs(): Promise<{ counts: JobCounts; jobs: JobSummary[] }> {
  return apiGet<{ counts: JobCounts; jobs: JobSummary[] }>("/api/jobs?limit=200");
}

interface StoredJob<T> {
  stage: string;
  result?: T;
  error?: string;
}

/** Loads the stored output of a finished run through its module's own endpoint. */
export async function fetchStoredResult(
  job: Pick<JobSummary, "id" | "module">
): Promise<{ ann?: Co2AnnResult; dispersion?: DispersionResult[]; error?: string }> {
  if (job.module === "dispersion") {
    const r = await apiGet<StoredJob<DispersionResult[]>>(`/api/dispersion/jobs/${job.id}`);
    return { dispersion: r.result, error: r.error };
  }
  const r = await apiGet<StoredJob<Co2AnnResult>>(`/api/co2-ann/jobs/${job.id}`);
  return { ann: r.result, error: r.error };
}

export async function saveDefaultLocation(
  body: { latitude: number; longitude: number; label?: string } | { clear: true }
) {
  const res = await apiPostJson<{ user: unknown }>("/api/auth/me/location", body, "PATCH");
  return res.user;
}

export const cancelJob = (id: string) => apiPostJson<{ ok: true }>(`/api/jobs/${id}/cancel`, {});
export const deleteFailedJobs = () => apiPostJson<{ deleted: number }>("/api/jobs?stage=failed", {}, "DELETE");
