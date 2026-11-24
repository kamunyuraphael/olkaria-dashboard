// Shared Leaflet bootstrap - loaded from CDN rather than an npm dependency
// (see components/map/MapPicker.tsx's original rationale: avoids bundling
// Leaflet's CSS/image assets through Vite for what's a handful of map
// widgets). Both MapPicker (coordinate picker) and ContourMap (dispersion
// results) load through this one function so the CSS link/script tag is
// only ever injected once, however many map widgets are on screen.

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletNamespace = any;

let loadPromise: Promise<LeafletNamespace> | null = null;

export function loadLeaflet(): Promise<LeafletNamespace> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const w = window as unknown as { L?: LeafletNamespace };
    if (w.L) {
      resolve(w.L);
      return;
    }

    const existing = document.getElementById("leaflet-js");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as unknown as { L: LeafletNamespace }).L));
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = LEAFLET_JS;
    script.onload = () => {
      const L = (window as unknown as { L: LeafletNamespace }).L;
      // Fix default marker icon paths once, globally, right after first load.
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images/marker-icon.png`,
        iconRetinaUrl: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images/marker-icon-2x.png`,
        shadowUrl: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images/marker-shadow.png`,
      });
      resolve(L);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
