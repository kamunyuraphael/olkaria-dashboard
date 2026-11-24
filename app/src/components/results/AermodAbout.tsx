import { Card } from "@/components/ui/Card";

const FACTS = ["Steady-state Gaussian plume", "US EPA preferred model", "Hourly meteorology", "Local scale, up to about 50 km"];

const ROWS: { heading: string; body: string }[] = [
  {
    heading: "What it is",
    body: "AERMOD was developed by the American Meteorological Society and the US EPA, and adopted by the EPA in 2005 as its preferred model for local-scale air quality assessments.",
  },
  {
    heading: "How it works",
    body: "For each hour it treats the wind and the stability of the air as steady, and spreads the plume sideways and upwards in a bell-shaped profile. Here, cloud cover sets a stability class (A to D) and wind speed sets the friction velocity. Mixing height and Monin-Obukhov length follow from the class.",
  },
  {
    heading: "What this tool runs",
    body: "A Python implementation of the AERMOD approach from the analysis team's notebook, not the EPA executable. It gives concentrations at a grid of points around your sources, averaged over 1 hour, 8 hours, 24 hours and the month.",
  },
  {
    heading: "Reading the maps",
    body: "Maps are smoothed and, for most averaging windows, scaled to reference peak values. Read them as where the plume goes and how areas compare. They are research outputs and not a regulatory compliance run.",
  },
];

/** Identity and plain-language explanation of the model behind a dispersion run. */
export function AermodAbout() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-bold tracking-wide">
          AERMOD
        </span>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">About the model behind these maps</h3>
      </div>
      <ul className="flex flex-wrap gap-2 mb-4" aria-label="Model facts">
        {FACTS.map((f) => (
          <li key={f} className="px-2.5 py-0.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)]">
            {f}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {ROWS.map((r) => (
          <div key={r.heading}>
            <dt className="text-xs font-semibold text-[var(--color-text-secondary)] mb-0.5">{r.heading}</dt>
            <dd className="text-[var(--color-text-tertiary)] leading-relaxed">{r.body}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
