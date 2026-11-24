import MapPicker from "@/components/map/MapPicker";
import type { Gas } from "@/models/analysis.types";

const GAS_LABEL: Record<Gas, string> = { SO2: "SO₂", CH4: "CH₄", CO2: "CO₂" };

/**
 * The live map that fills the main panel while there's no analysis to show
 * yet - replaces a lone centered icon in a sea of empty space with
 * something that's actually useful: you can see exactly where and how
 * large your query domain is, and still click/drag to adjust it, before
 * committing to a multi-minute run.
 */
export function QuerySitePreview({
  lat,
  lng,
  radiusKm,
  gas,
  onCoordsChange,
}: {
  lat: number;
  lng: number;
  radiusKm: number;
  gas: Gas;
  onCoordsChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="flex-1 relative rounded-xl overflow-hidden border border-[var(--color-border)] min-h-0">
      <MapPicker lat={lat} lng={lng} radiusKm={radiusKm} onChange={onCoordsChange} />

      <div className="absolute top-3 left-3 z-[400] pointer-events-none px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] font-mono text-[11px] text-[var(--color-text-secondary)] leading-tight shadow-sm">
        {lat.toFixed(4)}°, {lng.toFixed(4)}°
      </div>

      <div className="absolute top-3 right-3 z-[400] pointer-events-none flex items-center gap-1.5">
        <span className="px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-semibold shadow-sm">
          {GAS_LABEL[gas]}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-text-secondary)] shadow-sm">
          {radiusKm} km radius
        </span>
      </div>

      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] text-[11px] text-[var(--color-text-tertiary)] shadow-sm">
        Tap the map or drag the pin to adjust
      </div>
    </div>
  );
}
