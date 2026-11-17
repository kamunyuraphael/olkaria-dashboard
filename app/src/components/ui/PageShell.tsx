import type { ReactNode } from "react";

/** Standard scrollable page body: consistent padding, max width, and title block. */
export function PageShell({
  title,
  subtitle,
  actions,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="print-reset flex-1 min-w-0 overflow-y-auto">
      <div className={`mx-auto w-full px-3 sm:px-5 py-4 sm:py-5 flex flex-col gap-4 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-[var(--color-text-quaternary)] mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

export const primaryBtn =
  "px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer";
export const outlineBtn =
  "px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm font-medium rounded-lg hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer";
export const inputClass =
  "w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] placeholder-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors";
export const labelClass = "block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5";
