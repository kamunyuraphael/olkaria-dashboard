import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/controllers/useAuth";

export function UserMenu({ onOpenSettings, onOpenHelp }: { onOpenSettings: () => void; onOpenHelp: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold flex items-center justify-center hover:bg-[var(--color-primary-subtle-hover)] transition-colors cursor-pointer"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user.name}</p>
            <p className="text-xs text-[var(--color-text-quaternary)] truncate mt-0.5">{user.email}</p>
            <p className="text-xs text-[var(--color-text-quaternary)] truncate">{user.institution}</p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
          >
            Settings
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onOpenHelp();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
          >
            Help &amp; FAQ
          </button>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors cursor-pointer border-t border-[var(--color-border)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
