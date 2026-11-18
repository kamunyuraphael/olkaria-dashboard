import { useEffect, useState } from "react";
import { useJobs } from "@/controllers/useJobs";
import { Card } from "@/components/ui/Card";
import { PageShell, primaryBtn, outlineBtn, inputClass, labelClass } from "@/components/ui/PageShell";
import { FileSlot } from "@/components/upload/FileSlot";
import { ErrorIcon } from "@/components/status/AnalysisStates";
import { DispersionResults } from "@/components/results/DispersionResults";
import { useUploadAnalysis } from "@/controllers/useUploadAnalysis";
import { useElapsed } from "@/controllers/useElapsed";
import { submitDispersionAnalysis, pollDispersionAnalysis } from "@/lib/dispersionClient";
import { FileCheckNotice, hasBlockingError } from "@/components/upload/FileCheckNotice";
import { HelpTip } from "@/components/ui/HelpTip";
import { useFileCheck } from "@/controllers/useFileCheck";
import { checkMetFile, checkSourcesFile } from "@/lib/checkDataFile";
import { csvFile, downloadText, sampleMetCsv, sampleSourcesCsv } from "@/lib/sampleData";
import { DATA_FILE_ACCEPT, DATA_FILE_FORMAT_LABEL } from "@/lib/fileFormats";
import type { DispersionGas } from "@/models/dispersion.types";
import type { JobFilter } from "@/models/jobs.types";

const STORAGE_KEY = "olkaria:dispersion:jobId";

const GASES: { key: DispersionGas; label: string }[] = [
  { key: "CO2", label: "Carbon dioxide (CO₂)" },
  { key: "CH4", label: "Methane (CH₄)" },
  { key: "H2S", label: "Hydrogen sulphide (H₂S)" },
];

function hasSavedRun(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function DispersionView({ onOpenResults }: { onOpenResults: (f: JobFilter) => void }) {
  // Two screens: pick a gas + upload files, then watch the run / read the output.
  const [step, setStep] = useState<"upload" | "results">(hasSavedRun() ? "results" : "upload");
  const [gas, setGas] = useState<DispersionGas | "">("");
  const [metData, setMetData] = useState<File | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  const metCheck = useFileCheck(metData, checkMetFile);
  const srcCheck = useFileCheck(sourceFile, checkSourcesFile);
  const canRun = gas !== "" && metData !== null && sourceFile !== null && !hasBlockingError(metCheck) && !hasBlockingError(srcCheck);
  const useSample = () => {
    if (!gas) return;
    setMetData(csvFile("sample-met.csv", sampleMetCsv()));
    setSourceFile(csvFile(`sample-${gas}-sources.csv`, sampleSourcesCsv(gas)));
  };

  const { status, result, error, run, cancel, reset, startedAt, isRunning } = useUploadAnalysis(
    {
      submit: () => submitDispersionAnalysis({ metData: metData!, emissionSources: { [gas as DispersionGas]: sourceFile! } }),
      poll: pollDispersionAnalysis,
    },
    { storageKey: STORAGE_KEY }
  );
  const elapsed = useElapsed(startedAt, isRunning);
  const { refresh } = useJobs();
  useEffect(() => {
    if (status !== "idle") void refresh();
  }, [status, refresh]);
  const gasName = GASES.find((g) => g.key === gas)?.label;

  const start = () => {
    setStep("results");
    void run();
  };
  const backToUpload = () => {
    reset();
    setStep("upload");
  };

  /* ───────── Screen 2: run + output ───────── */
  if (step === "results") {
    return (
      <PageShell
        title="Gas dispersion"
        subtitle={gasName ? `${gasName} · results` : "Results"}
        actions={
          !isRunning && (
            <button onClick={backToUpload} className={outlineBtn}>
              ← New upload
            </button>
          )
        }
      >
        {(status === "idle" || isRunning) && (
          <Card className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-warning-subtle)] flex items-center justify-center mx-auto mb-4">
              <span className="w-4 h-4 rounded-full border-2 border-[var(--color-warning)] border-t-transparent animate-spin" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {status === "queued" ? "Queued…" : "Running dispersion model…"}
            </h3>
            <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed max-w-md mx-auto">
              {elapsed} elapsed — this usually takes 8–10 minutes. You can leave this page; the run continues and is
              saved in Results when it finishes.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button onClick={() => onOpenResults("active")} className={outlineBtn}>
                View in Results
              </button>
              <button onClick={() => void cancel()} className={`${outlineBtn} !border-[var(--color-danger)] !text-[var(--color-danger)]`}>
                Stop analysis
              </button>
            </div>
          </Card>
        )}

        {status === "cancelled" && (
          <Card className="p-8 text-center">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis stopped</h3>
            <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] max-w-md mx-auto">
              You stopped this run. Nothing was saved.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {canRun && (
                <button onClick={start} className={primaryBtn}>
                  Run again
                </button>
              )}
              <button onClick={backToUpload} className={outlineBtn}>
                Change files
              </button>
            </div>
          </Card>
        )}

        {status === "failed" && (
          <Card className="p-8 text-center">
            <ErrorIcon />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Analysis failed</h3>
            <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed max-w-md mx-auto">{error}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {canRun && (
                <button onClick={start} className={primaryBtn}>
                  Try again
                </button>
              )}
              <button onClick={backToUpload} className={outlineBtn}>
                Change files
              </button>
            </div>
          </Card>
        )}

        {status === "complete" && result && (
          <>
            <p className="text-xs text-[var(--color-text-quaternary)]">
              Saved to <button onClick={() => onOpenResults("complete")} className="text-[var(--color-primary)] hover:underline cursor-pointer">Results</button> — you can reopen it any time.
            </p>
            <DispersionResults result={result} />
          </>
        )}
      </PageShell>
    );
  }

  /* ───────── Screen 1: choose a gas, upload its files ───────── */
  return (
    <PageShell title="Gas dispersion" subtitle="Upload your data to map how one gas spreads around your site">
      <Card className="p-4 sm:p-6 max-w-2xl w-full">
        <div>
          <label className={labelClass} htmlFor="gas-select">
            1 · Which gas are you analysing?
          </label>
          <select
            id="gas-select"
            value={gas}
            onChange={(e) => {
              setGas(e.target.value as DispersionGas | "");
              setSourceFile(null);
            }}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">Choose a gas…</option>
            {GASES.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--color-text-quaternary)] mt-1.5">One gas per run keeps results quick (~8–10 minutes).</p>
        </div>

        {gas && (
          <div className="mt-6 flex flex-col gap-5">
            <div>
              <p className={labelClass}>2 · Weather data<HelpTip text="Hourly weather for the period you want to model: cloud cover, wind speed and wind direction. Wind carries the gas, so this drives the shape of the plume." /></p>
              <FileSlot
                label="Met data"
                hint={`Hourly cloud cover, temp, RH, pressure, wind · ${DATA_FILE_FORMAT_LABEL}`}
                accept={DATA_FILE_ACCEPT}
                required
                file={metData}
                onFile={setMetData}
              />
              <FileCheckNotice check={metCheck} />
            </div>
            <div>
              <p className={labelClass}>3 · {gasName} emission sources<HelpTip text="Where the gas comes from: each row is a source with its position (metres), size, release height and emission rate in grams per second." /></p>
              <FileSlot
                label={`${gasName?.match(/\((.*)\)/)?.[1] ?? gas} sources`}
                hint="Source ID, X/Y coords, emission rate"
                accept={DATA_FILE_ACCEPT}
                required
                file={sourceFile}
                onFile={setSourceFile}
              />
              <FileCheckNotice check={srcCheck} />
            </div>
            <p className="text-xs text-[var(--color-text-quaternary)] leading-relaxed">
              No files handy?{" "}
              <button type="button" onClick={useSample} className="text-[var(--color-primary)] hover:underline cursor-pointer">
                Try with sample data
              </button>
              {" · download "}
              <button type="button" onClick={() => downloadText("met-example.csv", sampleMetCsv())} className="text-[var(--color-primary)] hover:underline cursor-pointer">met example</button>
              {" / "}
              <button type="button" onClick={() => downloadText(`${gas}-sources-example.csv`, sampleSourcesCsv(gas))} className="text-[var(--color-primary)] hover:underline cursor-pointer">sources example</button>
            </p>
            <div>
              <button onClick={start} disabled={!canRun} className={`${primaryBtn} w-full sm:w-auto`}>
                Run analysis
              </button>
              {!canRun && (
                <p className="mt-2 text-xs text-[var(--color-text-quaternary)]">{metData && sourceFile ? "Fix the issues above to continue." : "Add both files to continue."}</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
