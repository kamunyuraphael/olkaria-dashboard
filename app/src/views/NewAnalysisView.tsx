import { Card } from "@/components/ui/Card";
import { QueryPanel } from "@/components/layout/QueryPanel";
import { JobPill } from "@/components/status/StatusPill";
import {
  AnalysisEmptyState,
  AnalysisRunningState,
  AnalysisFailedState,
} from "@/components/status/AnalysisStates";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import {
  CorrelationHeatmapCard,
  ModelMetricsCard,
  DetectionFloorBanner,
} from "@/components/charts/ResultsSummaryCards";
import { useState } from "react";
import { useQueryParams } from "@/controllers/useQueryParams";
import { useAnalysisJob } from "@/controllers/useAnalysisJob";
import type { Audience, Gas } from "@/models/analysis.types";

const GAS_UNIT: Record<Gas, string> = { SO2: "µg/m³", CH4: "ppb", CO2: "ppm" };

function AudienceToggle({ value, onChange }: { value: Audience; onChange: (a: Audience) => void }) {
  const options: { id: Audience; label: string }[] = [
    { id: "researcher", label: "Researcher" },
    { id: "policy", label: "Policy maker" },
  ];
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            value === opt.id
              ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function NewAnalysisView() {
  const q = useQueryParams();
  const job = useAnalysisJob();
  const [audience, setAudience] = useState<Audience>("researcher");

  const runLabel =
    job.status === "queued"
      ? "Queued"
      : job.status === "fetching"
      ? "Fetching satellite data"
      : "Running model";

  return (
    <div className="flex flex-1 gap-5 p-5 overflow-hidden min-h-0">
      <QueryPanel
        lat={q.lat}
        lng={q.lng}
        radiusKm={q.radiusKm}
        gas={q.gas}
        startDate={q.startDate}
        endDate={q.endDate}
        isRunning={job.isRunning}
        onLatChange={q.setLat}
        onLngChange={q.setLng}
        onRadiusChange={q.setRadiusKm}
        onGasChange={q.setGas}
        onStartDateChange={q.setStartDate}
        onEndDateChange={q.setEndDate}
        onCoordsChange={q.setCoords}
        onRun={() => job.runAnalysis(q.params)}
      />

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
        <Card className="px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {q.gas === "CH4" ? "CH₄" : q.gas === "CO2" ? "CO₂" : "SO₂"}
              <span className="text-[var(--color-text-tertiary)]"> · Olkaria Site A · </span>
              <span className="font-mono text-sm text-[var(--color-text-secondary)]">
                {q.startDate} to {q.endDate}
              </span>
            </span>
            <JobPill job={job.status} />
          </div>
          {job.status === "complete" && job.result && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-tertiary)] text-xs font-medium border border-[var(--color-border)]">
                Test window: {job.result.timeSeries.dates.length} days
              </span>
              <AudienceToggle value={audience} onChange={setAudience} />
            </div>
          )}
        </Card>

        {job.status === "idle" && (
          <AnalysisEmptyState
            lat={q.lat}
            lng={q.lng}
            radiusKm={q.radiusKm}
            gas={q.gas}
            onCoordsChange={q.setCoords}
          />
        )}
        {job.isRunning && <AnalysisRunningState label={runLabel} />}
        {job.status === "failed" && (
          <AnalysisFailedState onRetry={() => job.runAnalysis(q.params)} />
        )}

        {job.status === "complete" && job.result && (
          <>
            <TimeSeriesChart data={job.result.timeSeries} unit={GAS_UNIT[q.gas]} />
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <CorrelationHeatmapCard data={job.result.correlations} gas={q.gas} />
              <ModelMetricsCard audience={audience} data={job.result.timeSeries} unit={GAS_UNIT[q.gas]} />
            </div>
            {q.gas === "SO2" && <DetectionFloorBanner />}
          </>
        )}
      </div>
    </div>
  );
}
