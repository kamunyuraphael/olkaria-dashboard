import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { GasBadge } from "@/components/ui/GasBadge";
import { StatusPill } from "@/components/status/StatusPill";
import { LIBRARY_ROWS } from "@/lib/mockData";

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "warning" | "success" | "danger";
}) {
  const toneClass = {
    primary: "text-[var(--color-primary)]",
    warning: "text-[var(--color-warning)]",
    success: "text-[var(--color-success)]",
    danger: "text-[var(--color-danger)]",
  }[tone];

  return (
    <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
      <span className={`text-sm font-bold ${toneClass}`}>{value}</span>
      <span className="text-xs text-[var(--color-text-tertiary)]">{label}</span>
    </div>
  );
}

export function ResultsLibraryView({ onView }: { onView: () => void }) {
  const [search, setSearch] = useState("");

  const total = LIBRARY_ROWS.length;
  const running = LIBRARY_ROWS.filter((r) => r.status === "running").length;
  const complete = LIBRARY_ROWS.filter((r) => r.status === "complete").length;
  const failed = LIBRARY_ROWS.filter((r) => r.status === "failed").length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LIBRARY_ROWS;
    return LIBRARY_ROWS.filter((row) =>
      `${row.site} ${row.gas} ${row.status}`.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="flex-1 p-5 overflow-y-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Results Library</h2>
          <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">
            Past analyses — click View to open in the analysis panel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatChip label="total" value={total} tone="primary" />
          <StatChip label="running" value={running} tone="warning" />
          <StatChip label="complete" value={complete} tone="success" />
          <StatChip label="failed" value={failed} tone="danger" />
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xs">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-quaternary)]"
          >
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by site, gas or status…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] placeholder-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
          />
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">No results match “{search}”.</p>
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Site", "Gas", "Date Range", "Coverage", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  <td className="px-5 py-4 font-medium text-[var(--color-text-primary)]">{row.site}</td>
                  <td className="px-5 py-4">
                    <GasBadge gas={row.gas} />
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--color-text-tertiary)]">
                    {row.start} → {row.end}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--color-text-tertiary)]">{row.coverage}</td>
                  <td className="px-5 py-4">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {row.status === "complete" && (
                      <button
                        onClick={onView}
                        className="text-xs font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg px-3 py-1.5 hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
