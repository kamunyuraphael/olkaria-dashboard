import { useEffect } from "react";
import { ContourMap } from "@/components/map/ContourMap";
import type { ContourFeatureCollection } from "@/models/dispersion.types";

interface ContourMapModalProps {
  title: string;
  geojson: ContourFeatureCollection | null;
  unit: string;
  onClose: () => void;
}

/**
 * Full-screen view of a single dispersion contour field - mirrors
 * MapModal.tsx's structure/sizing/Escape-to-close convention exactly, so
 * the two "expand" affordances in the app feel like one pattern rather
 * than two. Mounts its own, larger ContourMap instance (scrollWheelZoom
 * enabled here, since a focused full-screen view is exactly where zooming
 * with the wheel is wanted - the small embedded card still disables it to
 * avoid hijacking page scroll).
 */
export function ContourMapModal({ title, geojson, unit, onClose }: ContourMapModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      // z-[1000], not z-50: neither this component nor the small map cards
      // behind it sit inside an ancestor that establishes its own stacking
      // context, so a card's hover-overlay button (z-[450], see ContourMap)
      // and this modal are compared directly against each other at the
      // document root. z-50 < 450 let the overlay button paint through the
      // modal; confirmed visually in QA before this fix.
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      // 0.92, not 0.55: the dashboard behind this modal has several other
      // ContourMap cards mounted (1hr/8hr/24hr/monthly), each with its own
      // always-on Leaflet zoom control. They don't unmount while this modal
      // is open - at 0.55 alpha their +/- buttons were visibly bleeding
      // through the backdrop, reading as duplicate/overlapping zoom
      // controls on top of this modal's own. Near-opaque hides them fully.
      style={{ background: "rgba(17,24,39,0.92)" }}
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden flex flex-col"
        style={{ width: "min(960px, 92vw)", height: "min(680px, 85vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] shrink-0">
          <div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
            <span className="ml-3 font-mono text-xs text-[var(--color-text-quaternary)]">{unit}</span>
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
          <ContourMap
            geojson={geojson}
            unit={unit}
            className="h-full"
            enableExpand={false}
            scrollWheelZoom
          />
        </div>
      </div>
    </div>
  );
}
