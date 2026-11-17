import { useState } from "react";
import { useAuth } from "@/controllers/useAuth";
import { getCurrentPosition } from "@/lib/geolocate";
import { inputClass, labelClass, primaryBtn, outlineBtn } from "@/components/ui/PageShell";

/** Edit the saved default location: use-my-location, or type coordinates. Used in Settings and the first-login prompt. */
export function LocationForm({
  onSaved,
  secondary,
}: {
  onSaved?: () => void;
  /** Extra button rendered next to Save (e.g. "Skip for now"). */
  secondary?: React.ReactNode;
}) {
  const { user, updateLocation } = useAuth();
  const home = user?.defaultLocation;
  const [lat, setLat] = useState(home ? String(home.latitude) : "");
  const [lng, setLng] = useState(home ? String(home.longitude) : "");
  const [label, setLabel] = useState(home?.label ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const latN = Number(lat);
  const lngN = Number(lng);
  const valid = lat.trim() !== "" && lng.trim() !== "" && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180;

  const locate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const p = await getCurrentPosition();
      setLat(String(p.latitude));
      setLng(String(p.longitude));
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Couldn't get your location." });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await updateLocation({ latitude: latN, longitude: lngN, label: label.trim() || undefined });
      setMsg({ kind: "ok", text: "Default location saved." });
      onSaved?.();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await updateLocation(null);
      setLat("");
      setLng("");
      setLabel("");
      setMsg({ kind: "ok", text: "Default location cleared." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not clear." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={locate} disabled={busy} className={`${outlineBtn} w-full sm:w-auto self-start flex items-center justify-center gap-2`}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Use my current location
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Latitude</label>
          <input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. -1.2921" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label className={labelClass}>Longitude</label>
          <input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 36.8219" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label className={labelClass}>Name (optional)</label>
          <input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Home site" className={inputClass} />
        </div>
      </div>

      {msg && (
        <p className={`text-xs ${msg.kind === "ok" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.text}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={!valid || busy} className={primaryBtn}>
          Save location
        </button>
        {secondary}
        {home && (
          <button type="button" onClick={clear} disabled={busy} className="px-3 py-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] cursor-pointer">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
