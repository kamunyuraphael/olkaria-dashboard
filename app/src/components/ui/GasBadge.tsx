import type { Gas } from "@/models/analysis.types";

const GAS_LABEL: Record<Gas, string> = { SO2: "SO₂", CH4: "CH₄", CO2: "CO₂" };

// Reuses existing semantic tokens rather than introducing new ones —
// each gas gets a stable, distinct color so it reads at a glance across
// the overview stats, library table, and query panel.
const GAS_TONE: Record<Gas, string> = {
  SO2: "text-[var(--color-warning)] bg-[var(--color-warning-subtle)]",
  CH4: "text-[var(--color-success)] bg-[var(--color-success-subtle)]",
  CO2: "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]",
};

export function GasBadge({ gas }: { gas: Gas | string }) {
  const tone = GAS_TONE[gas as Gas] ?? "text-[var(--color-text-secondary)] bg-[var(--color-bg)]";
  const label = GAS_LABEL[gas as Gas] ?? gas;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}
