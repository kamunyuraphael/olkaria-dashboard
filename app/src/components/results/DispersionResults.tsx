import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ContourMap } from "@/components/map/ContourMap";
import { DiurnalChart } from "@/components/charts/DiurnalChart";
import { DISPERSION_WINDOWS } from "@/models/dispersion.types";
import type { DispersionGas, DispersionResult } from "@/models/dispersion.types";
import { outlineBtn } from "@/components/ui/PageShell";
import { AermodAbout } from "@/components/results/AermodAbout";
import { gasLabel } from "@/components/results/JobBits";

/** Contour maps + diurnal charts for a finished dispersion run (live or stored). */
export function DispersionResults({ result }: { result: DispersionResult[] }) {
  const [activeGas, setActiveGas] = useState<DispersionGas>(result[0]?.gas ?? "CO2");

  // Keep the tab pointing at a gas the result actually contains.
  useEffect(() => {
    if (result.length > 0 && !result.some((r) => r.gas === activeGas)) setActiveGas(result[0].gas);
  }, [result, activeGas]);

  const active = result.find((r) => r.gas === activeGas);
  if (!active) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end no-print">
        <button onClick={() => window.print()} className={`${outlineBtn} !py-1.5 !px-3 !text-xs`}>Print / save PDF</button>
      </div>
      {result.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
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
              {gasLabel(r.gas)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {active.fields.map((f) => {
          const label = DISPERSION_WINDOWS.find((w) => w.key === f.window)?.label;
          return (
            <Card key={f.window} className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                {label} average: spatial distribution
              </h3>
              <ContourMap geojson={f.geojson} unit={f.unit} className="h-56" title={`${label} average: spatial distribution`} />
            </Card>
          );
        })}
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
          Diurnal variation vs. wind speed at receptors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(active.diurnalByReceptor).map(([receptor, points]) => (
            <div key={receptor}>
              <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">{receptor}</p>
              <DiurnalChart points={points} className="h-40" />
            </div>
          ))}
        </div>
      </Card>

      <AermodAbout />
    </div>
  );
}
