import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/controllers/useAuth";

const inputClass =
  "w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] placeholder-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors";
const labelClass = "block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5 mb-4">{description}</p>
      {children}
    </Card>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <div className="pr-6">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-toggle-off)]"
        }`}
        style={{ height: 22 }}
      >
        <span
          className={`block w-[18px] h-[18px] rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsView() {
  const { user, logout } = useAuth();
  const [defaultLat, setDefaultLat] = useState("-0.9006");
  const [defaultLng, setDefaultLng] = useState("36.2894");
  const [defaultRadius, setDefaultRadius] = useState("10");
  const [notifyComplete, setNotifyComplete] = useState(true);
  const [notifyFailed, setNotifyFailed] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);

  return (
    <div className="flex-1 p-5 overflow-y-auto">
      <div className="max-w-2xl">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Settings</h2>
          <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">Account details and analysis defaults</p>
        </div>

        <div className="flex flex-col gap-4">
          <SettingsSection title="Profile" description="Your account details">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" defaultValue={user?.name ?? ""} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email ?? ""}
                    disabled
                    className={`${inputClass} bg-[var(--color-bg)] text-[var(--color-text-quaternary)] cursor-not-allowed`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Institution</label>
                <input type="text" defaultValue={user?.institution ?? ""} className={inputClass} />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Analysis defaults"
            description="Pre-filled values when you open a new analysis"
          >
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Latitude</label>
                <input
                  type="text"
                  value={defaultLat}
                  onChange={(e) => setDefaultLat(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input
                  type="text"
                  value={defaultLng}
                  onChange={(e) => setDefaultLng(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>Radius (km)</label>
                <input
                  type="number"
                  value={defaultRadius}
                  onChange={(e) => setDefaultRadius(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Notifications"
            description="Analysis runs can take several minutes — choose what you're told about"
          >
            <Toggle
              label="Analysis complete"
              description="Notify me when a queued run finishes."
              checked={notifyComplete}
              onChange={setNotifyComplete}
            />
            <Toggle
              label="Analysis failed"
              description="Notify me when a run fails or returns no usable signal."
              checked={notifyFailed}
              onChange={setNotifyFailed}
            />
            <Toggle
              label="Weekly digest"
              description="A summary of your runs from the past week."
              checked={notifyDigest}
              onChange={setNotifyDigest}
            />
          </SettingsSection>

          <Card className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Sign out</h3>
              <p className="text-xs text-[var(--color-text-quaternary)] mt-0.5">End your session on this device</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-1.5 border border-[var(--color-danger)] text-[var(--color-danger)] text-sm font-medium rounded-lg hover:bg-[var(--color-danger-subtle)] transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
