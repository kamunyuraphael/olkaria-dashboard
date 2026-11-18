import type { JobSummary, JobStage } from "@/models/jobs.types";

const GAS_LABEL: Record<string, string> = { SO2: "SO₂", CH4: "CH₄", CO2: "CO₂", H2S: "H₂S" };
export const gasLabel = (g: string) => GAS_LABEL[g] ?? g;

export function jobTitle(job: JobSummary): string {
  if (job.module === "dispersion") {
    const gases = job.gases.map(gasLabel).join(", ");
    return `Gas dispersion${gases ? ` · ${gases}` : ""}`;
  }
  return `ANN · ${gasLabel(job.gas ?? "CO2")}`;
}

export function jobSubtitle(job: JobSummary): string {
  const parts: string[] = [];
  if (job.label) parts.push(job.label);
  if (job.module === "co2-ann") {
    if (job.dataSource === "satellite" && job.coordinates) {
      parts.push(`${job.coordinates.latitude.toFixed(2)}°, ${job.coordinates.longitude.toFixed(2)}°`);
      if (job.coordinates.startDate) parts.push(`${job.coordinates.startDate} → ${job.coordinates.endDate ?? ""}`);
    } else {
      parts.push("Uploaded data");
    }
  }
  return parts.join(" · ");
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}

const STAGE_STYLE: Record<JobStage, { bg: string; text: string; dot: string; label: string }> = {
  queued: { bg: "bg-[var(--color-bg)]", text: "text-[var(--color-text-tertiary)]", dot: "bg-[var(--color-text-quaternary)]", label: "Queued" },
  running: { bg: "bg-[var(--color-warning-subtle)]", text: "text-[var(--color-warning)]", dot: "bg-[var(--color-warning)] animate-pulse", label: "Running" },
  complete: { bg: "bg-[var(--color-success-subtle)]", text: "text-[var(--color-success)]", dot: "bg-[var(--color-success)]", label: "Complete" },
  cancelled: { bg: "bg-[var(--color-bg)]", text: "text-[var(--color-text-tertiary)]", dot: "bg-[var(--color-text-quaternary)]", label: "Stopped" },
  failed: { bg: "bg-[var(--color-danger-subtle)]", text: "text-[var(--color-danger)]", dot: "bg-[var(--color-danger)]", label: "Failed" },
};

export function StagePill({ stage }: { stage: JobStage }) {
  const s = STAGE_STYLE[stage];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
