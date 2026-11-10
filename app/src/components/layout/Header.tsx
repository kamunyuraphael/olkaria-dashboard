import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Page } from "@/models/analysis.types";

const PAGE_LABEL: Record<Page, string> = {
  overview: "Overview",
  analysis: "Satellite ANN analysis",
  dispersion: "Gas dispersion",
  library: "Results library",
  settings: "Settings",
};

export function Header({ page, onOpenSettings }: { page: Page; onOpenSettings: () => void }) {
  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-3.5 flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-[var(--color-text-quaternary)] truncate">Olkaria observatory</span>
        <span className="text-[var(--color-text-disabled)]">/</span>
        <span className="font-medium text-[var(--color-text-primary)] truncate">{PAGE_LABEL[page]}</span>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-tertiary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
          Private workspace
        </span>
        <ThemeToggle />
        <UserMenu onOpenSettings={onOpenSettings} />
      </div>
    </header>
  );
}
