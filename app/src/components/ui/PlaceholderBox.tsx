export function PlaceholderBox({
  label,
  height = "h-48",
}: {
  label: string;
  height?: string;
}) {
  return (
    <div
      className={`${height} bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] flex items-center justify-center`}
    >
      <span className="text-sm text-[var(--color-text-quaternary)] text-center px-4">{label}</span>
    </div>
  );
}
