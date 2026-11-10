import type { Co2AnnResult } from "@/models/co2ann.types";
import type { Gas } from "@/models/analysis.types";
import type { JobPollResult } from "@/controllers/useUploadAnalysis";
import { apiGet, apiPostJson } from "@/lib/apiClient";

// Module A's satellite ANN client. The file/route keep the historical
// "co2ann" name, but the same endpoints now serve SO2, CH4 and CO2 — the
// gas is just a field on the request (server/API_CONTRACT.md).

export interface Co2AnnCoordinateParams {
  gas: Gas;
  latitude: number;
  longitude: number;
  radiusKm: number;
  startDate?: string;
  endDate?: string;
}

interface SubmitResponse {
  jobId: string;
}

interface JobResponse {
  stage: "queued" | "running" | "complete" | "failed";
  startedAt?: number;
  result?: Co2AnnResult;
  error?: string;
}

/** POST /api/co2-ann/analyze — starts a real async job (~3 min) and returns its id. */
export async function submitCo2AnnAnalysis(params: Co2AnnCoordinateParams): Promise<{ jobId: string }> {
  const { jobId } = await apiPostJson<SubmitResponse>("/api/co2-ann/analyze", params);
  return { jobId };
}

/** GET /api/co2-ann/jobs/:jobId */
export async function pollCo2AnnAnalysis(jobId: string): Promise<JobPollResult<Co2AnnResult>> {
  return apiGet<JobResponse>(`/api/co2-ann/jobs/${jobId}`);
}
