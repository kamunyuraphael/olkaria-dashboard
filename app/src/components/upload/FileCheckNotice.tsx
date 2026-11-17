import type { FileCheck } from "@/lib/checkDataFile";

export function FileCheckNotice({ check }: { check: FileCheck | null }) {
  if (!check) return null;
  return (
    <div className="mt-2 text-xs leading-relaxed">
      {check.errors.map((e) => (
        <p key={e} className="text-[var(--color-danger)]">✕ {e}</p>
      ))}
      {check.warnings.map((w) => (
        <p key={w} className="text-[var(--color-warning)]">! {w}</p>
      ))}
      {check.summary && <p className="text-[var(--color-success)]">✓ {check.summary}</p>}
    </div>
  );
}

export const hasBlockingError = (c: FileCheck | null) => !!c && c.errors.length > 0;
