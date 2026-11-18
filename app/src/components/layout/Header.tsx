import { UserMenu } from "@/components/layout/UserMenu";
import { Notifications } from "@/components/layout/Notifications";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BrandMark } from "@/components/ui/BrandMark";
import { BRAND_NAME } from "@/lib/brand";
import type { Page } from "@/models/analysis.types";
import type { JobSummary } from "@/models/jobs.types";

const PAGE_LABEL: Record<Page, string> = {
  overview: "Overview",
  dispersion: "Gas dispersion",
  analysis: "ANN",
  library: "Results",
  settings: "Settings",
  admin: "Admin",
  help: "Help",
};

export function Header({
  page,
  onOpenSettings,
  onOpenHelp,
  onOpenJob,
  onSeeAll,
}: {
  page: Page;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenJob: (job: JobSummary) => void;
  onSeeAll: () => void;
}) {
  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 shrink-0 z-10">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="md:hidden shrink-0">
          <BrandMark size={24} />
        </span>
        <span className="hidden sm:inline text-[var(--color-text-quaternary)] truncate">{BRAND_NAME}</span>
        <span className="hidden sm:inline text-[var(--color-text-disabled)]">/</span>
        <span className="font-semibold sm:font-medium text-[var(--color-text-primary)] truncate">{PAGE_LABEL[page]}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-tertiary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
          Private workspace
        </span>
        <Notifications onOpenJob={onOpenJob} onSeeAll={onSeeAll} />
        <ThemeToggle />
        <UserMenu onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} />
      </div>
    </header>
  );
}
