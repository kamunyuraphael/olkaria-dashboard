import type { ReactNode } from "react";
import { outlineBtn } from "@/components/ui/PageShell";

/** Modal confirmation. Bottom sheet on phones, centered card elsewhere. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  disabled = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1100] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] p-5 max-h-[92vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <div className="text-sm text-[var(--color-text-tertiary)] mt-2 mb-4 leading-relaxed">{children}</div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className={outlineBtn}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || disabled}
            className={`px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50 cursor-pointer ${
              danger ? "bg-[var(--color-danger)]" : "bg-[var(--color-primary)]"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
