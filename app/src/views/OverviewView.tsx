import { Card } from "@/components/ui/Card";
import { GasBadge } from "@/components/ui/GasBadge";
import { StatusPill } from "@/components/status/StatusPill";
import { FieldPreviewMap } from "@/components/map/FieldPreviewMap";
import { LIBRARY_ROWS } from "@/lib/mockData";
import type { Page } from "@/models/analysis.types";

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "warning" | "success" | "danger";
}) {
  const toneClass = {
    primary: "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]",
    warning: "text-[var(--color-warning)] bg-[var(--color-warning-subtle)]",
    success: "text-[var(--color-success)] bg-[var(--color-success-subtle)]",
    danger: "text-[var(--color-danger)] bg-[var(--color-danger-subtle)]",
  }[tone];

  return (
    <Card className="p-4">
      <div className={`inline-flex w-7 h-7 rounded-md items-center justify-center text-xs font-bold ${toneClass}`}>
        {value}
      </div>
      <p className="mt-3 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
        {label}
      </p>
    </Card>
  );
}

export function OverviewView({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const total = LIBRARY_ROWS.length;
  const running = LIBRARY_ROWS.filter((r) => r.status === "running").length;
  const complete = LIBRARY_ROWS.filter((r) => r.status === "complete").length;
  const failed = LIBRARY_ROWS.filter((r) => r.status === "failed").length;
  const recent = LIBRARY_ROWS.slice(0, 4);

  return (
    <div className="flex-1 p-5 overflow-y-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Overview</h2>
          <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">
            A live record of your submitted analysis requests.
          </p>
        </div>
        <button
          onClick={() => onNavigate("analysis")}
          className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          New analysis
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatTile label="Total requests" value={total} tone="primary" />
        <StatTile label="In progress" value={running} tone="warning" />
        <StatTile label="Completed" value={complete} tone="success" />
        <StatTile label="Failed" value={failed} tone="danger" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 items-start">
        <Card>
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">Your work</p>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mt-0.5">Recent requests</h3>
            </div>
            <button
              onClick={() => onNavigate("library")}
              className="text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              View all →
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">
                No analysis requests yet. Create one to start a record of your study.
              </p>
            </div>
          ) : (
            <div>
              {recent.map((row) => (
                <div
                  key={row.id}
                  className="px-5 py-3.5 border-b border-[var(--color-border)] last:border-0 flex items-center gap-4"
                >
                  <span className="shrink-0">
                    <GasBadge gas={row.gas} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{row.site}</p>
                    <p className="text-xs font-mono text-[var(--color-text-quaternary)] mt-0.5">
                      {row.start} → {row.end} · {row.coverage} coverage
                    </p>
                  </div>
                  <StatusPill status={row.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <div className="h-40 flex">
            <FieldPreviewMap badge="Study area" />
          </div>
          <Card className="p-5">
            <p className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">Field note</p>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mt-1">
              Olkaria Geothermal Field
            </h3>
            <p className="mt-2 text-xs text-[var(--color-text-tertiary)] leading-relaxed">
              Located within the Great Rift Valley, Olkaria is a major source of geothermal power and a
              focus for atmospheric research.
            </p>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--color-text-quaternary)]">Coordinates</dt>
                <dd className="font-mono text-[var(--color-text-secondary)]">−0.9006, 36.2894</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--color-text-quaternary)]">Gases in scope</dt>
                <dd className="font-mono text-[var(--color-text-secondary)]">SO₂ · CH₄ · CO₂</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
