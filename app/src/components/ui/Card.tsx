import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl ${className}`}>
      {children}
    </div>
  );
}
