import { useEffect, useRef } from "react";
import { loadLeaflet } from "@/lib/leaflet";

/**
 * Static satellite view of the Olkaria field, centered on the fixed
 * dispersion study site (not coordinate-driven like the ANN module, so
 * there's no pin to drag) - fills the idle-state panel with real spatial
 * context instead of a lone upload icon.
 */
export function FieldPreviewMap({ badge = "AERMOD Gaussian plume" }: { badge?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([-0.9, 36.29], 12);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
          maxZoom: 18,
        }
      ).addTo(map);

      L.circleMarker([-0.9006, 36.2894], {
        radius: 6,
        color: "#0E7C86",
        fillColor: "#0E7C86",
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex-1 relative rounded-xl overflow-hidden border border-[var(--color-border)] min-h-0">
      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 144 }} />

      <div className="absolute top-3 left-3 z-[400] pointer-events-none px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] font-mono text-[11px] text-[var(--color-text-secondary)] leading-tight shadow-sm">
        0.9006° S, 36.2894° E
      </div>

      <div className="absolute top-3 right-3 z-[400] pointer-events-none px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-semibold shadow-sm">
        {badge}
      </div>

      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] text-[10px] font-semibold tracking-wider text-[var(--color-text-quaternary)] uppercase shadow-sm">
        Olkaria Geothermal Field · Kenya
      </div>
    </div>
  );
}
