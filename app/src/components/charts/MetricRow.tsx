export function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
      <span className="font-mono text-sm text-[var(--color-primary)] font-semibold">{value}</span>
    </div>
  );
}
