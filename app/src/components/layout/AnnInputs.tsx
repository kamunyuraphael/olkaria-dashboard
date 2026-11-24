import { Card } from "@/components/ui/Card";
import { FileSlot } from "@/components/upload/FileSlot";
import { inputClass, labelClass, primaryBtn } from "@/components/ui/PageShell";
import { DATA_FILE_ACCEPT, DATA_FILE_FORMAT_LABEL } from "@/lib/fileFormats";
import { GAS_COLUMN, downloadTemplate } from "@/lib/uploadTemplate";
import { HelpTip } from "@/components/ui/HelpTip";
import { FileCheckNotice, hasBlockingError } from "@/components/upload/FileCheckNotice";
import { useFileCheck } from "@/controllers/useFileCheck";
import { checkAnnFile } from "@/lib/checkDataFile";
import { csvFile, sampleAnnCsv } from "@/lib/sampleData";
import { SATELLITE_ENABLED, isGasEnabled } from "@/lib/features";
import type { Gas } from "@/models/analysis.types";

export type DataSource = "satellite" | "upload";

interface AnnInputsProps {
  lat: number;
  lng: number;
  radiusKm: number;
  gas: Gas;
  startDate: string;
  endDate: string;
  isRunning: boolean;
  onLatChange: (v: number) => void;
  onLngChange: (v: number) => void;
  onRadiusChange: (v: number) => void;
  onGasChange: (g: Gas) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onRun: () => void;
  source: DataSource;
  onSourceChange: (s: DataSource) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  label: string;
  onLabelChange: (v: string) => void;
  hasHome: boolean;
  onUseHome: () => void;
}

const SOURCES: { id: DataSource; label: string }[] = [
  { id: "satellite", label: "Satellite data" },
  { id: "upload", label: "My own data" },
];

const GASES: { id: Gas; label: string; disabled?: boolean }[] = (
  [
    { id: "CO2", label: "CO₂" },
    { id: "CH4", label: "CH₄" },
    { id: "SO2", label: "SO₂" },
  ] as { id: Gas; label: string }[]
).map((g) => (isGasEnabled(g.id) ? g : { ...g, label: `${g.label} · soon`, disabled: true }));

function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { id: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="group" aria-label={name} className="flex p-0.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          disabled={o.disabled}
          title={o.disabled ? "Coming soon" : undefined}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${
            value === o.id
              ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const num = (raw: string, set: (v: number) => void, positive = false) => {
  const v = parseFloat(raw);
  if (!isNaN(v) && (!positive || v > 0)) set(v);
};

/** Full-width input section at the top of the ANN page. */
export function AnnInputs(p: AnnInputsProps) {
  const isUpload = !SATELLITE_ENABLED || p.source === "upload";
  const check = useFileCheck(isUpload ? p.file : null, (f) => checkAnnFile(f, p.gas), [p.gas]);
  const canRun = !p.isRunning && (!isUpload || (p.file !== null && !hasBlockingError(check)));

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SATELLITE_ENABLED && <div>
          <p className={labelClass}>Data source<HelpTip text="Satellite data is fetched automatically for the coordinates you choose. “My own data” lets you upload your own daily measurements instead." /></p>
          <Segmented name="Data source" value={p.source} options={SOURCES} onChange={p.onSourceChange} />
        </div>}
        <div>
          <p className={labelClass}>Gas<HelpTip text="CO₂ is available now. CH₄ and SO₂ will follow." /></p>
          <Segmented name="Gas" value={p.gas} options={GASES} onChange={p.onGasChange} />
        </div>
      </div>

      {!isUpload ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <div>
            <label className={labelClass}>Latitude</label>
            <input inputMode="decimal" defaultValue={p.lat} key={`lat-${p.lat}`} onBlur={(e) => num(e.target.value, p.onLatChange)} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className={labelClass}>Longitude</label>
            <input inputMode="decimal" defaultValue={p.lng} key={`lng-${p.lng}`} onBlur={(e) => num(e.target.value, p.onLngChange)} className={`${inputClass} font-mono`} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={labelClass}>Radius (km)<HelpTip text="Satellite readings are averaged over a circle of this size around your point. Larger circles give more data but blur local detail." /></label>
            <input type="number" min={1} max={200} value={p.radiusKm} onChange={(e) => num(e.target.value, p.onRadiusChange, true)} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className={labelClass}>Start date</label>
            <input type="date" value={p.startDate} onChange={(e) => p.onStartDateChange(e.target.value)} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className={labelClass}>End date</label>
            <input type="date" value={p.endDate} onChange={(e) => p.onEndDateChange(e.target.value)} className={`${inputClass} font-mono`} />
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FileSlot label="Data file" hint={DATA_FILE_FORMAT_LABEL} accept={DATA_FILE_ACCEPT} required file={p.file} onFile={p.onFileChange} />
            <FileCheckNotice check={check} />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>Site or dataset label (optional)</label>
              <input type="text" maxLength={120} value={p.label} onChange={(e) => p.onLabelChange(e.target.value)} placeholder="e.g. Well pad 3" className={inputClass} />
            </div>
            <p className="text-xs text-[var(--color-text-quaternary)] leading-relaxed">
              Needs columns <span className="font-mono">date, {GAS_COLUMN[p.gas]}, temperature, ws, pressure, precipitation</span>.{" "}
              <button type="button" onClick={() => downloadTemplate(p.gas)} className="text-[var(--color-primary)] hover:underline cursor-pointer">
                Download template
              </button>{" · "}
              <button type="button" onClick={() => p.onFileChange(csvFile(`sample-${GAS_COLUMN[p.gas]}.csv`, sampleAnnCsv(p.gas)))} className="text-[var(--color-primary)] hover:underline cursor-pointer">
                Try with sample data
              </button>
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-[var(--color-text-quaternary)]">
          {!isUpload && p.hasHome && (
            <button type="button" onClick={p.onUseHome} className="text-[var(--color-primary)] hover:underline cursor-pointer">
              Use my default location
            </button>
          )}
          {!isUpload && !p.hasHome && "Tap the map below to pick a point."}
        </div>
        <button onClick={p.onRun} disabled={!canRun} className={`${primaryBtn} w-full sm:w-auto sm:min-w-[160px]`}>
          {p.isRunning ? "Running…" : "Run analysis"}
        </button>
      </div>
    </Card>
  );
}
