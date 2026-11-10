import { readFile } from "node:fs/promises";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { env } from "@/config/env.js";
import type { DispersionGas } from "@/types/domain.js";

/**
 * Calls into the analysis team's Python service. The exact contract there
 * (request shape, auth, whether it's sync HTTP or its own job system) is
 * still TBD with that team — this client is the one seam that isolates the
 * rest of server/ from that decision. Until ANALYSIS_SERVICE_URL is set,
 * everything below simulates, so the queue/worker/API layer is fully
 * exercisable without the real service running.
 */

// Node's built-in fetch (backed by undici) defaults to a 5-minute
// headersTimeout/bodyTimeout. The dispersion endpoint is a plain synchronous
// FastAPI route that does the real file-reading + Gaussian-plume computation
// inline and only sends response headers once it's fully done — for real
// production-scale data (202 sources, 2208+ hourly met rows) that's
// documented at ~8-10 minutes, well past the default. Past the default,
// fetch throws HeadersTimeoutError/UND_ERR_HEADERS_TIMEOUT even though the
// Python process is still legitimately working. Overriding the global
// dispatcher here (module load, before any fetch call in this process) is
// the only way to raise this for Node's fetch — there's no per-call option.
// 20 minutes gives headroom above both the ~8-10 min dispersion run and the
// shorter co2-ann run.
setGlobalDispatcher(
  new Agent({
    headersTimeout: 20 * 60_000,
    bodyTimeout: 20 * 60_000,
  })
);

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return env.ANALYSIS_SERVICE_TOKEN ? { ...extra, "X-Service-Token": env.ANALYSIS_SERVICE_TOKEN } : extra;
}

export interface Co2AnnAnalysisOutput {
  timeSeries: { dates: string[]; actual: number[]; ann: (number | null)[]; sarima: number[] };
  correlations: { feature: string; r: number }[];
}

export type SatelliteGas = "SO2" | "CH4" | "CO2";

export async function runCo2AnnAnalysis(input: {
  gas: SatelliteGas;
  latitude: number;
  longitude: number;
  radiusKm: number;
  startDate?: string;
  endDate?: string;
}): Promise<Co2AnnAnalysisOutput> {
  if (env.ANALYSIS_SERVICE_URL) {
    const res = await fetch(`${env.ANALYSIS_SERVICE_URL}/co2-ann/analyze`, {
      method: "POST",
      headers: serviceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`analysis-service co2-ann error: ${res.status}`);
    return (await res.json()) as Co2AnnAnalysisOutput;
  }

  // Simulated — matches app/src/lib/co2annClient.ts's synthetic shape so
  // frontend and backend agree while the real service isn't wired up yet.
  await new Promise((r) => setTimeout(r, 2000));
  const months = ["2023-05", "2023-06", "2023-07", "2023-08", "2023-09", "2023-10"];
  const sim = {
    CO2: { actual: [412, 415, 409, 418, 421, 417], ann: [411, 416, 410, 417, 420, 418], sarima: [410, 413, 412, 415, 419, 414] },
    SO2: { actual: [8.4, 9.1, 7.8, 10.2, 9.6, 8.9], ann: [8.6, 9.0, 8.1, 10.0, 9.4, 9.1], sarima: [8.8, 8.9, 8.5, 9.6, 9.5, 9.0] },
    CH4: { actual: [1902, 1906, 1899, 1911, 1915, 1910], ann: [1903, 1905, 1901, 1910, 1914, 1911], sarima: [1901, 1904, 1903, 1908, 1913, 1909] },
  }[input.gas];
  return {
    timeSeries: {
      dates: months,
      ...sim,
    },
    correlations: [
      { feature: "Temperature", r: 0.62 },
      { feature: "Wind Speed", r: -0.34 },
      { feature: "Pressure", r: 0.18 },
      { feature: "Precipitation", r: -0.27 },
    ],
  };
}

export interface DispersionAnalysisOutput {
  gas: DispersionGas;
  fields: { window: "1hr" | "8hr" | "24hr" | "monthly"; geojson: unknown; unit: string }[];
  diurnalByReceptor: Record<
    string,
    { hour: number; concentrationNorm: number; windSpeedNorm: number }[]
  >;
}

export async function runDispersionAnalysis(input: {
  metDataPath: string;
  emissionSourcePaths: Partial<Record<DispersionGas, string>>;
}): Promise<DispersionAnalysisOutput[]> {
  if (env.ANALYSIS_SERVICE_URL) {
    // Always upload the files rather than pass server-disk paths: the
    // analysis-service may be on a different host with no shared filesystem.
    const form = new FormData();
    const attach = async (field: string, filePath: string) => {
      form.append(field, new Blob([await readFile(filePath)]), path.basename(filePath));
    };
    await attach("metData", input.metDataPath);
    for (const [gas, filePath] of Object.entries(input.emissionSourcePaths)) {
      if (filePath) await attach(gas, filePath);
    }
    const res = await fetch(`${env.ANALYSIS_SERVICE_URL}/dispersion/analyze-upload`, {
      method: "POST",
      headers: serviceHeaders(),
      body: form,
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = ((await res.json()) as { detail?: string }).detail ?? "";
      } catch {
        /* non-JSON error body */
      }
      throw new Error(`analysis-service dispersion error: ${res.status}${detail ? ` - ${detail}` : ""}`);
    }
    return (await res.json()) as DispersionAnalysisOutput[];
  }

  await new Promise((r) => setTimeout(r, 3000));
  const gases = Object.keys(input.emissionSourcePaths) as DispersionGas[];
  const windows = ["1hr", "8hr", "24hr", "monthly"] as const;

  return gases.map((gas) => ({
    gas,
    fields: windows.map((window) => ({ window, geojson: null, unit: "µg m⁻³" })),
    diurnalByReceptor: Object.fromEntries(
      ["R1", "R2", "R3", "R4"].map((r) => [
        r,
        Array.from({ length: 24 }, (_, hour) => ({
          hour,
          concentrationNorm: Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2) * 0.9 + 0.1),
          windSpeedNorm: Math.max(0, Math.cos(((hour - 12) / 24) * Math.PI * 2) * 0.7 + 0.3),
        })),
      ])
    ),
  }));
}
