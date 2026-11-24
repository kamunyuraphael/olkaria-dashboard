import { useEffect, useState } from "react";
import { useJobs } from "@/controllers/useJobs";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { AnnInputs, type DataSource } from "@/components/layout/AnnInputs";
import { QuerySitePreview } from "@/components/map/QuerySitePreview";
import { JobPill } from "@/components/status/StatusPill";
import { AnalysisRunningState, AnalysisFailedState, AnalysisUploadEmptyState, AnalysisStoppedState } from "@/components/status/AnalysisStates";
import { AnnResults } from "@/components/results/AnnResults";
import { useQueryParams, type AnnPrefill } from "@/controllers/useQueryParams";
import { useAnalysisJob } from "@/controllers/useAnalysisJob";
import { SATELLITE_ENABLED, isGasEnabled } from "@/lib/features";
import { downloadTemplate, UPLOAD_REQUIREMENTS } from "@/lib/uploadTemplate";

const GAS_NAME = { SO2: "SO₂", CH4: "CH₄", CO2: "CO₂" } as const;

export function NewAnalysisView({ prefill }: { prefill?: AnnPrefill | null }) {
  const q = useQueryParams(prefill);
  const job = useAnalysisJob();
  const { refresh } = useJobs();
  // Keep the header bell / banner in step with this page's run.
  useEffect(() => {
    if (job.status !== "idle") void refresh();
  }, [job.status, refresh]);
  const [source, setSource] = useState<DataSource>(SATELLITE_ENABLED ? prefill?.source ?? "satellite" : "upload");
  // Only enabled gases can run; anything remembered from before falls back to CO₂.
  useEffect(() => {
    if (!isGasEnabled(q.gas)) q.setGas("CO2");
  }, [q.gas, q.setGas]);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState(prefill?.label ?? "");
  // The run the results on screen belong to; the inputs can change afterwards.
  const [shown, setShown] = useState<{ source: DataSource; gas: typeof q.gas }>({ source: SATELLITE_ENABLED ? "satellite" : "upload", gas: q.gas });

  const onRun = () => {
    setShown({ source, gas: q.gas });
    if (source === "upload") {
      if (file) job.runAnalysis({ kind: "upload", gas: q.gas, file, label });
    } else {
      job.runAnalysis({ kind: "satellite", params: q.params });
    }
  };

  const runLabel = job.status === "queued" ? "Queued" : job.status === "fetching" ? "Fetching satellite data" : "Running model";
  const showing = job.status !== "idle";
  const title =
    shown.source === "upload"
      ? job.result?.meta?.label || label || file?.name || "Uploaded data"
      : `${q.lat.toFixed(2)}°, ${q.lng.toFixed(2)}°`;

  return (
    <PageShell title="ANN" subtitle={SATELLITE_ENABLED ? "Forecast a gas from satellite data or from your own readings" : "Forecast CO₂ from your own daily readings"} wide>
      <AnnInputs
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
        onRun={onRun}
        source={source}
        onSourceChange={setSource}
        file={file}
        onFileChange={setFile}
        label={label}
        onLabelChange={setLabel}
        hasHome={q.hasHome}
        onUseHome={q.useHome}
      />

      {SATELLITE_ENABLED && source === "satellite" && (
        <div className="h-64 sm:h-80 flex flex-col">
          <QuerySitePreview lat={q.lat} lng={q.lng} radiusKm={q.radiusKm} gas={q.gas} onCoordsChange={q.setCoords} />
        </div>
      )}

      {showing && (
        <Card className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {GAS_NAME[shown.gas]} <span className="text-[var(--color-text-tertiary)]">· {title}</span>
          </span>
          <JobPill job={job.status} />
          {job.status === "complete" && (
            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-tertiary)] text-xs font-medium border border-[var(--color-border)]">
              {shown.source === "upload" ? "Uploaded data" : "Satellite data"}
            </span>
          )}
        </Card>
      )}

      {job.status === "idle" && (!SATELLITE_ENABLED || source === "upload") && (
        <AnalysisUploadEmptyState requirements={UPLOAD_REQUIREMENTS} onDownloadTemplate={() => downloadTemplate(q.gas)} />
      )}
      {job.isRunning && <AnalysisRunningState label={runLabel} onStop={job.cancel} />}
      {job.status === "cancelled" && <AnalysisStoppedState onRetry={() => job.runAnalysis()} />}
      {job.status === "failed" && <AnalysisFailedState onRetry={() => job.runAnalysis()} message={job.error} source={shown.source} />}
      {job.status === "complete" && job.result && <AnnResults result={job.result} gas={shown.gas} source={shown.source} />}
    </PageShell>
  );
}
