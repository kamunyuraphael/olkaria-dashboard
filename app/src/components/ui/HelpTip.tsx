import { useEffect, useRef, useState } from "react";

/** Small "?" that opens a short plain-language explanation (tap-friendly, no hover needed). */
export function HelpTip({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-block align-middle ${className}`}>
      <button
        type="button"
        aria-label="What is this?"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 w-4 h-4 rounded-full border border-[var(--color-border)] text-[10px] leading-none font-semibold text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 top-6 w-56 max-w-[70vw] p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg text-xs font-normal normal-case tracking-normal text-[var(--color-text-secondary)] leading-relaxed"
        >
          {text}
        </span>
      )}
    </span>
  );
}
