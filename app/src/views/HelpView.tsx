import { Card } from "@/components/ui/Card";
import { PageShell, outlineBtn } from "@/components/ui/PageShell";
import { downloadTemplate } from "@/lib/uploadTemplate";
import { downloadText, sampleMetCsv, sampleSourcesCsv } from "@/lib/sampleData";
import type { Page } from "@/models/analysis.types";

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "What's the difference between Gas dispersion and ANN?",
    a: "Gas dispersion maps how one gas spreads through the air around known emission sources, using weather data. ANN forecasts how a gas concentration changes over time at a location, from your own daily measurements.",
  },
  {
    q: "How long does a run take?",
    a: "ANN runs take a few minutes; gas dispersion takes about 8–10 minutes per gas. You can leave the page. The run continues and is saved in Results. The bar under the header shows what's still running and tells you when it's done.",
  },
  {
    q: "What file formats can I upload?",
    a: "CSV, TSV or Excel (.xlsx / .xls). CSV files are checked in your browser first, so you'll see exactly what's missing before you start.",
  },
  {
    q: "What does the ANN file need?",
    a: "One file with a date column, the gas reading (co2, ch4 or so2), temperature, ws (wind speed), pressure and precipitation. Daily records, at least 205 days. Hourly data is averaged to daily for you; weekly or monthly data isn't supported yet.",
  },
  {
    q: "What do the dispersion files need?",
    a: "Weather: Year, Month, Day, Hour, Cloud Cover (Oktas), Wind Speed (km/h), Wind Direction (°). Sources: Source ID, X Coord (m), Y Coord (m), XLength (m), YLength (m), Emission Rate (g/s), Release Height, Base Elevation. At least three sources, one gas per run.",
  },
  {
    q: "Why was my run marked Failed?",
    a: "Open the run in Results to see the reason. Most often a column is missing, the data has too many gaps, or too few days were supplied. Fix the file and use “Run again”.",
  },
  {
    q: "What do RMSE, MAE and R² mean?",
    a: "RMSE and MAE are the typical size of the forecast error in the gas's own unit. Smaller is better. R² is how much of the real variation the model captured: 1 is perfect, 0 is no better than the average.",
  },
  {
    q: "What is the default location for?",
    a: "It's the starting point for the map on the gas dispersion page so you don't retype coordinates. Change it any time in Settings.",
  },
  {
    q: "Can I save a result as PDF or an image?",
    a: "Yes. On an ANN result use “Print / save PDF”, “Download CSV” or “Save image” on the chart. Dispersion results can be printed or saved as PDF.",
  },
];

export function HelpView({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <PageShell title="Help" subtitle="Quick answers and example files">
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <div className="flex flex-col gap-2">
          {FAQ.map((f) => (
            <Card key={f.q} className="px-4 py-3">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-primary)] list-none flex justify-between gap-3">
                  {f.q}
                  <span aria-hidden className="text-[var(--color-text-quaternary)]">+</span>
                </summary>
                <p className="mt-2 text-sm text-[var(--color-text-tertiary)] leading-relaxed">{f.a}</p>
              </details>
            </Card>
          ))}
        </div>

        <Card className="p-4 sm:p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Example files</h3>
          <p className="text-xs text-[var(--color-text-quaternary)] leading-relaxed">Download, open in Excel, replace with your own numbers.</p>
          <div className="flex flex-col gap-2">
            <button className={outlineBtn} onClick={() => downloadTemplate("CO2")}>ANN template (CO₂)</button>
            <button className={outlineBtn} onClick={() => downloadTemplate("CH4")}>ANN template (CH₄)</button>
            <button className={outlineBtn} onClick={() => downloadTemplate("SO2")}>ANN template (SO₂)</button>
            <button className={outlineBtn} onClick={() => downloadText("met-example.csv", sampleMetCsv())}>Dispersion weather example</button>
            <button className={outlineBtn} onClick={() => downloadText("sources-example.csv", sampleSourcesCsv("CO2"))}>Dispersion sources example</button>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)] flex gap-2 flex-wrap">
            <button onClick={() => onNavigate("analysis")} className="text-xs text-[var(--color-primary)] hover:underline cursor-pointer">Open ANN</button>
            <button onClick={() => onNavigate("dispersion")} className="text-xs text-[var(--color-primary)] hover:underline cursor-pointer">Open Gas dispersion</button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
