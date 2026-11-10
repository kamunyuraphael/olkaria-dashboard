import { useState } from "react";
import { Card } from "@/components/ui/Card";
import MapPicker from "@/components/map/MapPicker";
import { MapModal } from "@/components/map/MapModal";
import type { Gas } from "@/models/analysis.types";

interface QueryPanelProps {
  lat: number;
  lng: number;
  radiusKm: number;
  gas: Gas;
  startDate: string;
  endDate: string;
  isRunning: boolean;
  onLatChange: (v: number) => void;
  onLngChange: (v: number) => void;
  onRadiusChange: (v: number) => void;
  onGasChange: (g: Gas) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onCoordsChange: (lat: number, lng: number) => void;
  onRun: () => void;
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] placeholder-[var(--color-text-disabled)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors font-mono";
const labelClass = "block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5";

export function QueryPanel(props: QueryPanelProps) {
  const [mapExpanded, setMapExpanded] = useState(false);

  return (
    <Card className="w-72 shrink-0 flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-[var(--color-border)]">
        <h2 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Query Parameters</h2>
      </div>

      <div className="p-5 flex flex-col gap-5 flex-1">
        <div className="relative h-36 rounded-lg overflow-hidden border border-[var(--color-border)] group">
          <MapPicker
            lat={props.lat}
            lng={props.lng}
            radiusKm={props.radiusKm}
            onChange={props.onCoordsChange}
          />
          {!mapExpanded && (
            // !mapExpanded: without this, the button can stay visually
            // "hovered" (CSS :hover doesn't re-evaluate just because the
            // modal mounts under a stationary cursor) and poke out past
            // MapModal's edges until the next real mouse move - same issue
            // found and fixed in ContourMap.tsx.
            <button
              onClick={() => setMapExpanded(true)}
              className="absolute inset-0 w-full h-full cursor-pointer z-[400] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(14,124,134,0.12)" }}
              title="Expand map"
            >
              <span className="flex items-center gap-1.5 bg-white/90 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] shadow-sm">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 4.5V1h3.5M7.5 1H11v3.5M11 7.5V11H7.5M4.5 11H1V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Expand map
              </span>
            </button>
          )}
        </div>
        {mapExpanded && (
          <MapModal
            lat={props.lat}
            lng={props.lng}
            radiusKm={props.radiusKm}
            onChange={props.onCoordsChange}
            onClose={() => setMapExpanded(false)}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Latitude</label>
            <input
              type="text"
              value={props.lat}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) props.onLatChange(v);
              }}
              placeholder="e.g. -0.9006"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Longitude</label>
            <input
              type="text"
              value={props.lng}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) props.onLngChange(v);
              }}
              placeholder="e.g. 36.2894"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Buffer radius (km)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={props.radiusKm}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v > 0) props.onRadiusChange(v);
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Gas</label>
          <div className="flex gap-2">
            {(["SO2", "CH4", "CO2"] as const).map((g) => (
              <button
                key={g}
                onClick={() => props.onGasChange(g)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border cursor-pointer ${
                  props.gas === g
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-tertiary)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {g === "SO2" ? "SO₂" : g === "CH4" ? "CH₄" : "CO₂"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Start date</label>
            <input
              type="text"
              value={props.startDate}
              onChange={(e) => props.onStartDateChange(e.target.value)}
              placeholder="2024-01-01"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>End date</label>
            <input
              type="text"
              value={props.endDate}
              onChange={(e) => props.onEndDateChange(e.target.value)}
              placeholder="2024-12-31"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-auto pt-2">
          <button
            onClick={props.onRun}
            disabled={props.isRunning}
            className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
          >
            {props.isRunning ? "Running…" : "Run Analysis"}
          </button>
        </div>
      </div>
    </Card>
  );
}
