import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-full bg-[var(--color-bg)] flex flex-col overflow-y-auto">
      <header className="px-6 py-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3">
          <BrandMark size={32} />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Olkaria Gas Dashboard</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-7">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-tertiary)] leading-relaxed">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-4 text-center text-sm text-[var(--color-text-tertiary)]">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export const authInputClass =
  "w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] placeholder-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors";

export const authLabelClass = "block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5";

export function AuthButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 px-3 py-2.5 bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/30 rounded-lg">
      <p className="text-xs text-[var(--color-danger-text)]">{message}</p>
    </div>
  );
}
