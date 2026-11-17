import { Card } from "@/components/ui/Card";
import { PageShell, inputClass, labelClass, outlineBtn } from "@/components/ui/PageShell";
import { LocationForm } from "@/components/layout/LocationForm";
import { LocationMap } from "@/components/map/LocationMap";
import { useAuth } from "@/controllers/useAuth";
import { PasswordForm } from "@/components/layout/PasswordFields";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useState } from "react";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5 mb-4">{description}</p>
      {children}
    </Card>
  );
}

export function SettingsView() {
  const { user, logout, deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const doDelete = async () => {
    setBusy(true);
    setErr(null);
    try {
      await deleteAccount(pw);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete the account.");
      setBusy(false);
    }
  };
  const home = user?.defaultLocation;

  return (
    <PageShell title="Settings" subtitle="Your account and default location">
      <div className="flex flex-col gap-4 max-w-2xl">
        <Section title="Profile" description="Your account details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input readOnly value={user?.name ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input readOnly value={user?.email ?? ""} className={`${inputClass} bg-[var(--color-bg)] text-[var(--color-text-quaternary)]`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Institution</label>
              <input readOnly value={user?.institution ?? ""} className={inputClass} />
            </div>
          </div>
        </Section>

        <Section title="Default location" description="New analyses start from these coordinates">
          {home && <LocationMap lat={home.latitude} lng={home.longitude} className="h-44 mb-4" />}
          <LocationForm />
        </Section>

        <Section title="Password" description="Use at least 8 characters">
          <PasswordForm />
        </Section>

        <Card className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Sign out</h3>
            <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">End your session on this device</p>
          </div>
          <button onClick={logout} className={`${outlineBtn} !border-[var(--color-danger)] !text-[var(--color-danger)]`}>
            Sign out
          </button>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between gap-3 !border-[var(--color-danger)]/40">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Delete my account</h3>
            <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">Removes your account and every saved run</p>
          </div>
          <button onClick={() => setConfirming(true)} className={`${outlineBtn} !border-[var(--color-danger)] !text-[var(--color-danger)] shrink-0`}>
            Delete
          </button>
        </Card>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete your account?"
          confirmLabel="Delete permanently"
          danger
          busy={busy}
          disabled={!pw}
          onConfirm={doDelete}
          onCancel={() => {
            setConfirming(false);
            setPw("");
            setErr(null);
          }}
        >
          <p>All your runs, results and uploaded files are removed and can't be recovered. Enter your password to confirm.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className={`${inputClass} mt-3`} placeholder="Password" />
          {err && <p className="text-xs text-[var(--color-danger)] mt-2">{err}</p>}
        </ConfirmDialog>
      )}
    </PageShell>
  );
}
