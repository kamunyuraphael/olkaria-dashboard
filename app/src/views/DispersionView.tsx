import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FileSlot } from "@/components/upload/FileSlot";
import { ContourMap } from "@/components/map/ContourMap";
import { FieldPreviewMap } from "@/components/map/FieldPreviewMap";
import { ErrorIcon } from "@/components/status/AnalysisStates";
import { DiurnalChart } from "@/components/charts/DiurnalChart";
import { useUploadAnalysis } from "@/controllers/useUploadAnalysis";
import { useElapsed } from "@/controllers/useElapsed";
import { submitDispersionAnalysis, pollDispersionAnalysis } from "@/lib/dispersionClient";
import { DATA_FILE_ACCEPT, DATA_FILE_FORMAT_LABEL } from "@/lib/fileFormats";
import { DISPERSION_WINDOWS } from "@/models/dispersion.types";
import type { DispersionGas } from "@/models/dispersion.types";

const GASES: { key: DispersionGas; label: string }[] = [
  { key: "CO2", label: "CO₂" },
  { key: "CH4", label: "CH₄" },
  { key: "H2S", label: "H₂S" },
];

export function DispersionView() {
  const [metData, setMetData] = useState<File | null>(null);
  const [emissionFiles, setEmissionFiles] = useState<Partial<Record<DispersionGas, File>>>({});
  const [activeGas, setActiveGas] = useState<DispersionGas>("CO2");

  const gasesAttached = GASES.filter((g) => emissionFiles[g.key]);
  const canRun = metData !== null && gasesAttached.length > 0;

  const { status, result, error, run, reset, startedAt, isRunning } = useUploadAnalysis(
    {
      submit: () => submitDispersionAnalysis({ metData: metData!, emissionSources: emissionFiles }),
      poll: pollDispersionAnalysis,
    },
    { storageKey: "olkaria:dispersion:jobId" }
  );
  const elapsed = useElapsed(startedAt, isRunning);

  // activeGas defaults to "CO2" and otherwise only ever changes via a tab
  // click, but a fresh result doesn't necessarily contain CO2 at all (e.g.
  // a CH4-only or H2S-only submission). Without this, activeGas is left
  // pointing at a gas that isn't in the new result, activeResult below
  // comes back undefined, and the whole results section - wrapped in
  // {activeResult && (...)} - silently renders nothing: the gas tab itself
  // still shows (it's built straight from result.map), but nothing appears
  // under it unless the user happens to click that one tab themselves.
  // Re-sync whenever the current activeGas isn't one of the gases the
  // latest result actually has.
  useEffect(() => {
    if (!result || result.length === 0) return;
    if (!result.some((r) => r.gas === activeGas)) {
      setActiveGas(result[0].gas);
    }
  }, [result, activeGas]);

  const activeResult = result?.find((r) => r.gas === activeGas);

  return (
    <div className="flex flex-1 gap-5 p-5 overflow-hidden min-h-0">
      {/* Upload sidebar */}
      <Card className="w-80 shrink-0 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h2 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            AERMOD Dispersion
          </h2>
          <p className="text-xs text-[var(--color-text-quaternary)] mt-1">
            Upload met data and at least one gas's emission sources ({DATA_FILE_FORMAT_LABEL})
          </p>
        </div>

        <div className="p-5 flex flex-col gap-5 flex-1">
          <FileSlot
            label="Met data"
            hint="Hourly cloud cover, temp, RH, pressure, wind"
            accept={DATA_FILE_ACCEPT}
            required
            file={metData}
            onFile={(f) => {
              setMetData(f);
              reset();
            }}
          />

          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-3">Emission sources</p>
            <div className="flex flex-col gap-3">
              {GASES.map((g) => (
                <FileSlot
                  key={g.key}
                  label={`${g.label} sources`}
                  hint="Source ID, X/Y coords, emission rate"
                  accept={DATA_FILE_ACCEPT}
                  file={emissionFiles[g.key] ?? null}
                  onFile={(f) => {
                    setEmissionFiles((prev) => {
                      const next = { ...prev };
                      if (f) next[g.key] = f;
                      else delete next[g.key];
                      return next;
                    });
                    reset();
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto pt-2">
            {/* analysis-service runs every submitted gas sequentially inside
                one request (CO2, then CH4, then H2S - see analysis-service's
                dispersion_analyze), so each additional gas adds its own full
                8-10 minute pipeline rather than running in parallel. Warning
                before they run, not just a longer spinner message after,
                since this is the moment they can still choose to split the
                upload into separate single-gas runs instead. */}
            {gasesAttached.length > 1 && (
              <p className="mb-2 text-xs text-[var(--color-warning)] bg-[var(--color-warning-subtle)] rounded-lg px-3 py-2 leading-relaxed">
                {gasesAttached.length} gases selected — they run one after another, not in
                parallel, so this analysis will take roughly {gasesAttached.length}× as long
                (~{gasesAttached.length * 8}-{gasesAttached.length * 10} min). For a faster
                result, run one gas at a time instead.
              </p>
            )}
            <button
              onClick={run}
              disabled={!canRun || isRunning}
              className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              {isRunning ? "Running…" : "Run Analysis"}
            </button>
            {!canRun && (
              <p className="mt-2 text-xs text-[var(--color-text-quaternary)] text-center">
                Met data + at least one gas's sources required
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
        {status === "idle" && (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <FieldPreviewMap />
            <p className="shrink-0 text-center text-sm text-[var(--color-text-tertiary)]">
              No analysis yet — upload met data and at least one gas's emission sources, then run.
            </p>
          </div>
        )}

        {isRunning && (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-sm text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-warning-subtle)] flex items-center justify-center mx-auto mb-4">
                <span className="w-4 h-4 rounded-full border-2 border-[var(--color-warning)] border-t-transparent animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 w-full max-w-[180px] mx-auto mb-4">
                <span className={`h-1 flex-1 rounded-full ${status === "queued" ? "bg-[var(--color-warning)]" : "bg-[var(--color-success)]"}`} />
                <span className={`h-1 flex-1 rounded-full ${status === "running" ? "bg-[var(--color-warning)]" : "bg-[var(--color-border)]"}`} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {status === "queued" ? "Queued…" : "Running dispersion model…"}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">
                {elapsed} elapsed — typically takes {gasesAttached.length * 8}-
                {gasesAttached.length * 10} minutes for {gasesAttached.length}{" "}
                gas{gasesAttached.length === 1 ? "" : "es"}. You can leave this page; it'll
                pick back up when you return.
              </p>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-sm text-center px-6">
              <ErrorIcon />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis failed</h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">{error}</p>
              <button
                onClick={run}
                className="mt-5 px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium rounded-lg hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {status === "complete" && result && (
          <>
            {/* Gas tabs — only gases that were uploaded get a tab */}
            <div className="flex items-center gap-2 shrink-0">
              {result.map((r) => (
                <button
                  key={r.gas}
                  onClick={() => setActiveGas(r.gas)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeGas === r.gas
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-bg)] text-[var(--color-text-tertiary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  {GASES.find((g) => g.key === r.gas)?.label}
                </button>
              ))}
            </div>

            {activeResult && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {activeResult.fields.map((f) => {
                    const label = DISPERSION_WINDOWS.find((w) => w.key === f.window)?.label;
                    return (
                      <Card key={f.window} className="p-5">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                          {label} average — spatial distribution
                        </h3>
                        <ContourMap
                          geojson={f.geojson}
                          unit={f.unit}
                          className="h-52"
                          title={`${label} average — spatial distribution`}
                        />
                      </Card>
                    );
                  })}
                </div>

                <Card className="p-5 shrink-0">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                    Diurnal variation vs. wind speed at receptors
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(activeResult.diurnalByReceptor).map(([receptor, points]) => (
                      <div key={receptor}>
                        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                          {receptor}
                        </p>
                        <DiurnalChart points={points} className="h-40" />
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
