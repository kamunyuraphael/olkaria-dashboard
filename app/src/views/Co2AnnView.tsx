import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PlaceholderBox } from "@/components/ui/PlaceholderBox";
import { FileSlot } from "@/components/upload/FileSlot";
import { useUploadAnalysis } from "@/controllers/useUploadAnalysis";
import { useElapsed } from "@/controllers/useElapsed";
import { submitCo2AnnAnalysis, pollCo2AnnAnalysis } from "@/lib/co2annClient";
import { DATA_FILE_ACCEPT, DATA_FILE_FORMAT_LABEL } from "@/lib/fileFormats";

export function Co2AnnView() {
  const [co2Data, setCo2Data] = useState<File | null>(null);
  const [metData, setMetData] = useState<File | null>(null);
  const canRun = co2Data !== null && metData !== null;

  const { status, result, error, run, reset, startedAt, isRunning } = useUploadAnalysis(
    {
      submit: () => submitCo2AnnAnalysis({ co2Data: co2Data!, metData: metData! }),
      poll: pollCo2AnnAnalysis,
    },
    { storageKey: "olkaria:co2ann:jobId" }
  );
  const elapsed = useElapsed(startedAt, isRunning);

  return (
    <div className="flex flex-1 gap-5 p-5 overflow-hidden min-h-0">
      {/* Upload sidebar */}
      <Card className="w-72 shrink-0 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h2 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            CO₂ ANN Forecast
          </h2>
          <p className="text-xs text-[var(--color-text-quaternary)] mt-1">
            Upload CO₂ readings and weather/met data as separate files ({DATA_FILE_FORMAT_LABEL})
          </p>
        </div>

        <div className="p-5 flex flex-col gap-5 flex-1">
          <FileSlot
            label="CO₂ readings"
            hint="date, co2"
            accept={DATA_FILE_ACCEPT}
            required
            file={co2Data}
            onFile={(f) => {
              setCo2Data(f);
              reset();
            }}
          />

          <FileSlot
            label="Weather / met data"
            hint="date, temperature, ws, pressure, precipitation"
            accept={DATA_FILE_ACCEPT}
            required
            file={metData}
            onFile={(f) => {
              setMetData(f);
              reset();
            }}
          />

          <div className="mt-auto pt-2">
            <button
              onClick={run}
              disabled={!canRun || isRunning}
              className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              {isRunning ? "Running…" : "Run Analysis"}
            </button>
            {!canRun && (
              <p className="mt-2 text-xs text-[var(--color-text-quaternary)] text-center">
                Both files required
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
        {status === "idle" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-sm text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-subtle)] flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M3 17l4-6 3 3 4-8 4 5" stroke="var(--color-primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">No analysis yet</h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">
                Upload CO₂ readings and weather/met data, then run the analysis to see the
                forecast and correlation results.
              </p>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-sm text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-warning-subtle)] flex items-center justify-center mx-auto mb-4">
                <span className="w-4 h-4 rounded-full border-2 border-[var(--color-warning)] border-t-transparent animate-spin" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {status === "queued" ? "Queued…" : "Running ANN forecast…"}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)]">
                {elapsed} elapsed, typically takes about 3 minutes. You can leave this page;
                it'll pick back up when you return.
              </p>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-sm text-center px-6">
              <h3 className="text-sm font-semibold text-[var(--color-danger)]">Analysis failed</h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)]">{error}</p>
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
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Actual vs Predicted Values Using SARIMA and ANN
              </h3>
              <PlaceholderBox
                label={`Line chart — ${result.timeSeries.dates.length} points: Actual, ANN, SARIMA`}
                height="h-64"
              />
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Pearson Correlation with CO₂
              </h3>
              <PlaceholderBox
                label={`Bar chart — ${result.correlations.map((c) => c.feature).join(", ")}`}
                height="h-56"
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
