import { useEffect, useRef, useState } from "react";
import { loadLeaflet } from "@/lib/leaflet";
import { ContourMapModal } from "@/components/map/ContourMapModal";
import type { ContourFeatureCollection } from "@/models/dispersion.types";

interface ContourMapProps {
  geojson: ContourFeatureCollection | null;
  unit: string;
  className?: string;
  // Header shown in the expanded modal (e.g. "1-hour average"). Falls back
  // to the unit when omitted.
  title?: string;
  // Shows a hover-reveal "Expand map" overlay (matching MapPicker/MapModal's
  // existing convention in QueryPanel.tsx) that opens a larger instance of
  // this same map in a modal. The modal renders its own ContourMap with
  // this set to false, so it doesn't try to nest another expand affordance.
  enableExpand?: boolean;
  // Leaflet's scroll-wheel zoom - off by default for a small embedded card
  // (so scrolling the page doesn't get hijacked), on for the expanded modal
  // view where zooming with the wheel is exactly what's wanted.
  scrollWheelZoom?: boolean;
}

interface LegendEntry {
  title: string;
  color: string;
}

interface LegendSummary {
  gradient: string; // CSS linear-gradient stops, low -> high
  minLabel: string;
  maxLabel: string;
}

function summarizeLegend(entries: LegendEntry[]): LegendSummary | null {
  if (entries.length === 0) return null;
  // Levels come out of the GeoJSON in ascending order (field_to_geojson
  // writes them low -> high), so a plain left-to-right gradient over their
  // colors reproduces the server's viridis ramp without re-deriving one.
  const gradient = `linear-gradient(to right, ${entries.map((e) => e.color).join(", ")})`;
  return {
    gradient,
    minLabel: entries[0].title.trim(),
    maxLabel: entries[entries.length - 1].title.trim(),
  };
}

interface AxisTick {
  key: string;
  pos: number; // px within the map container - left for a lon tick, top for a lat tick
  label: string;
}

// Rounds a raw "degrees per tick" spacing to a human-legible step (1/2/5 x
// a power of ten) - the same nice-number rule matplotlib's own tick locator
// uses, so the lon/lat values read like the notebook's axis labels rather
// than arbitrary bounds-derived fractions.
function niceStep(rawStep: number): number {
  if (!(rawStep > 0)) return 0.01;
  const exp = Math.floor(Math.log10(rawStep));
  const base = rawStep / 10 ** exp;
  const niceBase = base < 1.5 ? 1 : base < 3 ? 2 : base < 7 ? 5 : 10;
  return niceBase * 10 ** exp;
}

function computeTickValues(min: number, max: number, targetCount = 5): number[] {
  if (!(max > min)) return [];
  const step = niceStep((max - min) / targetCount);
  const start = Math.ceil(min / step) * step;
  const values: number[] = [];
  for (let v = start; v <= max + step * 1e-6; v += step) values.push(Number(v.toFixed(8)));
  return values;
}

function formatDeg(value: number, step: number): string {
  const decimals = Math.min(6, Math.max(0, Math.ceil(-Math.log10(step)) + 1));
  return `${value.toFixed(decimals)}°`;
}

/**
 * Renders dispersion contour polygons over a satellite basemap, translucent
 * enough that roads/terrain/the lake stay legible underneath - matching the
 * analysis team's own real figures (4.4, 4.14, 4.17 etc., each titled
 * "...over Satellite Terrain Background"), confirmed by reading those
 * images directly rather than assumed. An earlier pass here dropped the
 * basemap for a plain white canvas on the theory that it matched "the cell
 * outputs" better - that was checked against the wrong cell (36, the one
 * exception that plots in bare meters with no basemap) and was wrong; the
 * other cells all use a basemap. The polygons' fill/stroke colors are NOT
 * computed here - the analysis
 * service's `field_to_geojson` pipeline already bakes a viridis sequential
 * ramp into each feature's own `properties` (fill, fill-opacity, stroke,
 * stroke-opacity, stroke-width, title), confirmed against a real generated
 * fixture. This component just reads those properties, matching the
 * dataviz skill's "sequential = one hue, computed not eyeballed" rule by
 * trusting the server's already-validated ramp rather than re-deriving one
 * client-side.
 */
export function ContourMap({
  geojson,
  unit,
  className = "",
  title,
  enableExpand = true,
  scrollWheelZoom = false,
}: ContourMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [legend, setLegend] = useState<LegendEntry[]>([]);
  const [axisTicks, setAxisTicks] = useState<{ lon: AxisTick[]; lat: AxisTick[] }>({ lon: [], lat: [] });
  const [isExpanded, setIsExpanded] = useState(false);
  // Flips once the async-loaded map actually exists, so the layer-drawing
  // effect below (which reads mapRef.current) re-runs at that point instead
  // of only on geojson/unit changes - otherwise a geojson/unit that's
  // already set on first mount would race the CDN-loaded Leaflet bundle and
  // never get drawn at all.
  const [mapReady, setMapReady] = useState(false);

  // Bootstrap the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom,
        attributionControl: true,
      }).setView([-0.9, 36.29], 12); // placeholder view before the data fits bounds

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
          maxZoom: 18,
        }
      ).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw/update the contour layer whenever the geojson changes, or once the
  // map becomes ready after an initial load race.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled) return;

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      setLegend([]);

      if (!geojson || geojson.features.length === 0) return;

      const seen = new Map<string, string>();

      const layer = L.geoJSON(geojson as any, {
        style: (feature: any) => {
          const p = feature?.properties ?? {};
          return {
            fillColor: p.fill ?? "#0E7C86",
            fillOpacity: p["fill-opacity"] ?? 0.5,
            color: p.stroke ?? p.fill ?? "#0E7C86",
            opacity: p["stroke-opacity"] ?? 0.8,
            weight: p["stroke-width"] ?? 1,
          };
        },
        onEachFeature: (feature: any, lyr: any) => {
          const title = feature?.properties?.title as string | undefined;
          const fill = feature?.properties?.fill as string | undefined;
          if (title && fill && !seen.has(title)) seen.set(title, fill);
          if (title) {
            lyr.bindTooltip(`${title} ${unit}`, { sticky: true });
          }
        },
      }).addTo(map);

      layerRef.current = layer;

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [16, 16] });
      }

      // Legend entries in the order the levels naturally fall (low -> high),
      // matching the sequential ramp's light-to-dark progression.
      setLegend(Array.from(seen, ([title, color]) => ({ title, color })));
    });

    return () => {
      cancelled = true;
    };
  }, [geojson, unit, mapReady]);

  // Lat/lon axis ticks - Leaflet has no built-in equivalent of matplotlib's
  // axis spine, so this reads tick positions straight off the live map
  // (recomputed on pan/zoom/resize via latLngToContainerPoint) rather than
  // drawing a static overlay that would drift as soon as the user interacts
  // with the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const recompute = () => {
      const bounds = map.getBounds();
      const size = map.getSize();

      const lonValues = computeTickValues(bounds.getWest(), bounds.getEast());
      const latValues = computeTickValues(bounds.getSouth(), bounds.getNorth());
      const lonStep = lonValues.length > 1 ? lonValues[1] - lonValues[0] : 0.01;
      const latStep = latValues.length > 1 ? latValues[1] - latValues[0] : 0.01;

      const lon: AxisTick[] = lonValues
        .map((lng) => ({
          key: `lon-${lng}`,
          pos: map.latLngToContainerPoint([bounds.getSouth(), lng]).x,
          label: formatDeg(lng, lonStep),
        }))
        .filter((t) => t.pos > 28 && t.pos < size.x - 8);

      const lat: AxisTick[] = latValues
        .map((val) => ({
          key: `lat-${val}`,
          pos: map.latLngToContainerPoint([val, bounds.getWest()]).y,
          label: formatDeg(val, latStep),
        }))
        .filter((t) => t.pos > 8 && t.pos < size.y - 20);

      setAxisTicks({ lon, lat });
    };

    recompute();
    map.on("move zoom resize", recompute);
    return () => {
      map.off("move zoom resize", recompute);
    };
  }, [mapReady, geojson]);

  if (!geojson || geojson.features.length === 0) {
    return (
      <div
        className={`${className} flex items-center justify-center text-sm text-[var(--color-text-quaternary)] bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] rounded-lg`}
      >
        No contour data for this window.
      </div>
    );
  }

  const legendSummary = summarizeLegend(legend);

  return (
    <div className={`${className} relative overflow-hidden rounded-lg group`}>
      <div ref={containerRef} className="w-full h-full" />
      {/* Lat/lon axis ticks, matplotlib-spine style: short recessive marks
          anchored to the bottom (longitude) and left (latitude) edges,
          not a full grid - a grid of lines would fight the satellite
          imagery for attention, per the dataviz skill's "recessive
          grid/axes" rule. pointer-events-none so dragging/zooming the map
          still works through this layer. z-[420]: above the contour/tile
          panes (Leaflet's overlayPane sits at z=400) but below the legend
          (z-[500]) and expand-overlay button (z-[450]). */}
      <div className="absolute inset-0 pointer-events-none z-[420]">
        {axisTicks.lon.map((t) => (
          <div
            key={t.key}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: t.pos, transform: "translateX(-50%)" }}
          >
            <div className="w-px h-1.5 bg-[var(--color-text-quaternary)]/70" />
            <span className="mt-0.5 px-1 py-0.5 rounded text-[9px] font-mono leading-none text-[var(--color-text-secondary)] bg-[var(--color-surface)]/85 shadow-sm">
              {t.label}
            </span>
          </div>
        ))}
        {axisTicks.lat.map((t) => (
          <div
            key={t.key}
            className="absolute left-0 flex items-center gap-0.5"
            style={{ top: t.pos, transform: "translateY(-50%)" }}
          >
            <div className="h-px w-1.5 bg-[var(--color-text-quaternary)]/70" />
            <span className="px-1 py-0.5 rounded text-[9px] font-mono leading-none text-[var(--color-text-secondary)] bg-[var(--color-surface)]/85 shadow-sm">
              {t.label}
            </span>
          </div>
        ))}
      </div>
      {enableExpand && !isExpanded && (
        // !isExpanded, not just the z-index fix on the modal, matters here:
        // CSS :hover doesn't re-evaluate just because the modal mounts on
        // top of a stationary cursor (no mousemove fires), so this button
        // can stay visually "hovered" and poke out past the modal's edges
        // until the user's next real mouse move - confirmed via QA. Not
        // rendering it at all while its own modal is open removes the
        // stale-hover window entirely, rather than papering over it with
        // z-index alone.
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute inset-0 w-full h-full cursor-pointer z-[450] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(14,124,134,0.12)" }}
          title="Expand map"
        >
          <span className="flex items-center gap-1.5 bg-white/90 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] shadow-sm">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 4.5V1h3.5M7.5 1H11v3.5M11 7.5V11H7.5M4.5 11H1V7.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Expand map
          </span>
        </button>
      )}
      {isExpanded && (
        <ContourMapModal
          title={title ?? unit}
          geojson={geojson}
          unit={unit}
          onClose={() => setIsExpanded(false)}
        />
      )}
      {legendSummary && (
        // A continuous gradient bar, not a stacked swatch list - the levels
        // here can run to a dozen+ entries, which would either overflow a
        // small card or collide with Leaflet's top-left zoom control. A
        // single low->high bar is also the correct reading for a sequential
        // ramp (one hue, light->dark) per the dataviz method, rather than
        // treating each level as a distinct category.
        <div className="absolute bottom-2 right-2 z-[500] bg-[var(--color-surface)]/95 border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 shadow-md max-w-[70%]">
          <div className="text-[9px] font-semibold text-[var(--color-text-tertiary)] mb-1 truncate">
            {unit}
          </div>
          <div
            className="h-2 w-full rounded-full"
            style={{ background: legendSummary.gradient }}
          />
          <div className="flex items-center justify-between gap-2 mt-0.5 text-[9px] text-[var(--color-text-quaternary)]">
            <span className="truncate">{legendSummary.minLabel}</span>
            <span className="truncate">{legendSummary.maxLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}
