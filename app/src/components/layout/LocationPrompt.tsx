import { useState } from "react";
import { useAuth } from "@/controllers/useAuth";
import { LocationForm } from "@/components/layout/LocationForm";
import { outlineBtn } from "@/components/ui/PageShell";

const key = (id: string) => `gaswatch:location-prompt-skipped:${id}`;

/** One-time prompt after sign-in asking for a default location. Skippable; it can always be set in Settings. */
export function LocationPrompt() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return user ? localStorage.getItem(key(user.id)) === "1" : true;
    } catch {
      return false;
    }
  });

  if (!user || user.defaultLocation || dismissed) return null;

  const skip = () => {
    try {
      localStorage.setItem(key(user.id), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-lg bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Set your default location</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-1 mb-4 leading-relaxed">
          Where do you usually work? New analyses will start from here so you don't have to type coordinates each
          time. You can change it later in Settings.
        </p>
        <LocationForm
          onSaved={() => setDismissed(true)}
          secondary={
            <button type="button" onClick={skip} className={outlineBtn}>
              Skip for now
            </button>
          }
        />
      </div>
    </div>
  );
}
