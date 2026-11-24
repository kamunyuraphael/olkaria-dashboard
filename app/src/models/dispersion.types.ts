// Gas dispersion module (upload-based).

export type DispersionGas = "CO2" | "CH4" | "H2S";

export type DispersionWindow = "1hr" | "8hr" | "24hr" | "monthly";

export const DISPERSION_WINDOWS: { key: DispersionWindow; label: string }[] = [
  { key: "1hr", label: "1-hour" },
  { key: "8hr", label: "8-hour" },
  { key: "24hr", label: "24-hour" },
  { key: "monthly", label: "Monthly" },
];

// Minimal local stand-in for GeoJSON.FeatureCollection so this file has no
// external type dependency yet. Swap for the real `geojson` package types
// once contour polygons are actually being rendered (see MapPicker/Turf
// notes) - the shape below is compatible with that package's type.
export interface ContourFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }>;
}

export interface DispersionFieldResult {
  window: DispersionWindow;
  // Contour polygons, generated server-side (geojsoncontour) - see the
  // architecture note in the project memory.
  geojson: ContourFeatureCollection | null;
  unit: string; // e.g. "µg m⁻³"
}

export interface DiurnalReceptorPoint {
  hour: number;
  concentrationNorm: number;
  windSpeedNorm: number;
}

export interface DispersionResult {
  gas: DispersionGas;
  fields: DispersionFieldResult[]; // one per DispersionWindow, up to 4
  // One normalized diurnal series per receptor (R1-R4 in the source notebook).
  diurnalByReceptor: Record<string, DiurnalReceptorPoint[]>;
}
