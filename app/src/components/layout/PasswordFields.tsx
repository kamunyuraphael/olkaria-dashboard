import { useState } from "react";
import { useAuth } from "@/controllers/useAuth";
import { inputClass, labelClass, primaryBtn } from "@/components/ui/PageShell";

/** Current + new password form. Used in Settings and in the forced first-login prompt. */
export function PasswordForm({ onDone, submitLabel = "Change password" }: { onDone?: () => void; submitLabel?: string }) {
  const { changePassword } = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const problem =
    next && next.length < 8 ? "Use at least 8 characters." : again && again !== next ? "Passwords don't match." : null;
  const ready = cur && next.length >= 8 && next === again;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await changePassword(cur, next);
      setCur("");
      setNext("");
      setAgain("");
      setMsg({ ok: true, text: "Password updated." });
      onDone?.();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change password." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelClass}>Current password</label>
        <input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>New password</label>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Repeat new password</label>
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={inputClass} />
        </div>
      </div>
      {(problem || msg) && (
        <p className={`text-xs ${!problem && msg?.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
          {problem ?? msg?.text}
        </p>
      )}
      <button type="submit" disabled={!ready || busy} className={`${primaryBtn} self-start`}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

/** Blocks the app until a user with a temporary password chooses their own. */
export function ForcePasswordChange() {
  const { user } = useAuth();
  if (!user?.mustChangePassword) return null;
  return (
    <div className="fixed inset-0 z-[1200] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Choose your own password</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-1 mb-4 leading-relaxed">
          You signed in with a temporary password. Set a new one to continue — enter the temporary password as the current one.
        </p>
        <PasswordForm submitLabel="Save and continue" />
      </div>
    </div>
  );
}
