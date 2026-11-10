import type { DispersionGas, DispersionResult } from "@/models/dispersion.types";
import type { JobPollResult } from "@/controllers/useUploadAnalysis";
import { apiGet, apiPostForm } from "@/lib/apiClient";

export interface DispersionUploadFiles {
  metData: File;
  emissionSources: Partial<Record<DispersionGas, File>>;
}

interface SubmitResponse {
  jobId: string;
}

interface JobResponse {
  stage: "queued" | "running" | "complete" | "failed";
  startedAt?: number;
  result?: DispersionResult[];
  error?: string;
}

/**
 * Submits met data + per-gas emission-source files and starts the real
 * AERMOD run (server/API_CONTRACT.md: POST /api/dispersion/analyze,
 * multipart). Real runtime confirmed by the analysis team at ~8-10
 * minutes — the longest-running job in the system — so this is a real
 * job (see useUploadAnalysis's sessionStorage persistence), not a plain
 * request/response.
 */
export async function submitDispersionAnalysis(
  files: DispersionUploadFiles
): Promise<{ jobId: string }> {
  const form = new FormData();
  form.append("metData", files.metData);
  for (const gas of Object.keys(files.emissionSources) as DispersionGas[]) {
    const file = files.emissionSources[gas];
    if (file) form.append(gas, file);
  }
  const { jobId } = await apiPostForm<SubmitResponse>("/api/dispersion/analyze", form);
  return { jobId };
}

/** GET /api/dispersion/jobs/:jobId */
export async function pollDispersionAnalysis(
  jobId: string
): Promise<JobPollResult<DispersionResult[]>> {
  const res = await apiGet<JobResponse>(`/api/dispersion/jobs/${jobId}`);
  return res;
}
