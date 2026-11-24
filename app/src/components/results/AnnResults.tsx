import { useRef, useState } from "react";
import { downloadSvgAsPng } from "@/lib/exportSvg";
import { FutureForecastCard } from "@/components/charts/FutureForecastCard";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CorrelationHeatmapCard, ModelMetricsCard, DetectionFloorBanner } from "@/components/charts/ResultsSummaryCards";
import { annMetrics, naiveMetrics, fmt } from "@/lib/forecastMetrics";
import { downloadText } from "@/lib/sampleData";
import { outlineBtn } from "@/components/ui/PageShell";
import type { Audience, Gas } from "@/models/analysis.types";
import type { Co2AnnResult, Co2AnnMeta } from "@/models/co2ann.types";

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

/** Plain-language notes about what was done to an uploaded file, so nothing happens silently. */
function dataPrepNotes(meta: Co2AnnMeta | undefined): string[] {
  if (!meta) return [];
  const notes: string[] = [];
  if (meta.annEvaluation) {
    notes.push(
      `Both models are scored on the same last ${meta.annEvaluation.window} days. The ANN was trained on the whole file and its level is shifted to match the observed average, so its fit here is more optimistic than a true forecast of unseen days.`
    );
  }
  if (meta.source !== "upload") return notes;
  if (meta.resampledToDaily) notes.push("Your records were finer than daily, so they were averaged to daily values.");
  if (meta.dateOrder === "day-first-assumed") notes.push("Dates such as 03/04/2024 could be read two ways; they were read as day/month. If that is wrong, re-save the file with dates like 2024-04-03.");
  if (meta.filledDays) notes.push(`${meta.filledDays} day(s) had no reading and were filled by interpolation.`);
  if (meta.simulated) notes.push("Simulated output - the server has no analysis service connected.");
  return notes;
}

/** Charts + notes for one finished ANN run. Used live on the ANN page and for stored runs in Results. */
export function AnnResults({ result, gas, source }: { result: Co2AnnResult; gas: Gas; source: "satellite" | "upload" }) {
  const [audience, setAudience] = useState<Audience>("researcher");
  // Uploaded files carry whatever units the user's instrument used, so don't claim one.
  const unit = source === "upload" ? undefined : GAS_UNIT[gas];
  const notes = dataPrepNotes(result.meta);
  const wrap = useRef<HTMLDivElement>(null);
  const m = annMetrics(result.timeSeries);
  const ts = result.timeSeries;
  const naive = naiveMetrics(ts);
  const gasName = gas === "CO2" ? "CO₂" : gas === "CH4" ? "CH₄" : "SO₂";
  const u = unit ? " " + unit : "";
  const summary = m
    ? m.r2 < 0
      ? `The ANN did not beat simply predicting the average ${gasName} (R² ${m.r2.toFixed(2)}), with an average error of ${fmt(m.mae)}${u} over ${m.n} days. Treat its day-to-day shape with caution.`
      : `The ANN forecast followed the observed ${gasName} values with an average error of ${fmt(m.mae)}${u} over ${m.n} days (R² ${m.r2.toFixed(2)}${m.r2 >= 0.7 ? ", a strong fit" : m.r2 >= 0.4 ? ", a moderate fit" : ", a weak fit, so treat with caution"}).`
    : null;
  const yardstick =
    m && naive
      ? `For reference, guessing that each day equals the day before gives an average error of ${fmt(naive.mae)}${u}${naive.rmse < m.rmse ? ", closer than the ANN" : ""}.`
      : null;
  const exportCsv = () =>
    downloadText(
      `${gas.toLowerCase()}-forecast.csv`,
      ["date,actual,ann,sarima", ...ts.dates.map((d, i) => `${d},${ts.actual[i]},${ts.ann[i] ?? ""},${ts.sarima[i] ?? ""}`)].join("\n") + "\n"
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-tertiary)] text-xs font-medium border border-[var(--color-border)]">
          Test window: {result.timeSeries.dates.length} days
        </span>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button onClick={exportCsv} className={`${outlineBtn} !py-1.5 !px-3 !text-xs`}>Download CSV</button>
          <button onClick={() => window.print()} className={`${outlineBtn} !py-1.5 !px-3 !text-xs`}>Print / save PDF</button>
          <AudienceToggle value={audience} onChange={setAudience} />
        </div>
      </div>
      {summary && <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{summary}{yardstick ? ` ${yardstick}` : ""}</p>}
      {notes.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}
      <div ref={wrap}>
        <TimeSeriesChart
          data={result.timeSeries}
          unit={unit}
          onExport={() => {
            const svg = wrap.current?.querySelector<SVGSVGElement>("[data-chart] svg");
            if (svg) downloadSvgAsPng(svg, `${gas.toLowerCase()}-forecast.png`);
          }}
        />
      </div>
      {result.future && <FutureForecastCard future={result.future} unit={unit} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CorrelationHeatmapCard data={result.correlations} gas={gas} />
        <ModelMetricsCard audience={audience} data={result.timeSeries} unit={unit} />
      </div>
      {gas === "SO2" && source === "satellite" && <DetectionFloorBanner />}
    </div>
  );
}
