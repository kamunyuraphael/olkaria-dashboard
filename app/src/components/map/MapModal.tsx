import { useEffect } from "react";
import MapPicker from "@/components/map/MapPicker";

export function MapModal({
  lat,
  lng,
  radiusKm,
  onChange,
  onClose,
}: {
  lat: number;
  lng: number;
  radiusKm: number;
  onChange: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      // z-[1000], not z-50: QueryPanel's own hover-overlay "Expand map"
      // button (z-[400]) sits in a plain, non-stacking-context ancestor
      // chain, so it's compared directly against this modal's z-index at
      // the document root rather than being reliably covered by it. Matches
      // the same fix in ContourMapModal.tsx, found via QA on that one.
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(17,24,39,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden flex flex-col"
        style={{ width: "min(860px, 92vw)", height: "min(580px, 80vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] shrink-0">
          <div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Set Coordinates</span>
            <span className="ml-3 font-mono text-xs text-[var(--color-text-quaternary)]">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <MapPicker lat={lat} lng={lng} radiusKm={radiusKm} onChange={onChange} />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-bg-subtle)]">
          <span className="text-xs text-[var(--color-text-quaternary)]">
            Click anywhere on the map or drag the pin to update coordinates
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
