import { useRef, useState } from "react";
import type { DiurnalReceptorPoint } from "@/models/dispersion.types";

interface DiurnalChartProps {
  points: DiurnalReceptorPoint[]; // one per hour, 0-23, each value normalized 0-1
  className?: string;
}

// Fixed drawing surface - scaled to the container by the SVG's viewBox, so
// the chart stays crisp at any card size without recomputing geometry.
const WIDTH = 320;
const HEIGHT = 170;
const PAD_LEFT = 28;
const PAD_RIGHT = 10;
const PAD_TOP = 28; // room for the legend
const PAD_BOTTOM = 22; // room for hour ticks

const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

const X_TICK_HOURS = [0, 6, 12, 18, 23];
const Y_TICKS = [0, 0.5, 1];

function xFor(hour: number): number {
  return PAD_LEFT + (hour / 23) * PLOT_WIDTH;
}
function yFor(value: number): number {
  return PAD_TOP + (1 - value) * PLOT_HEIGHT;
}
function pathFor(points: DiurnalReceptorPoint[], key: "concentrationNorm" | "windSpeedNorm"): string {
  return points
    .slice()
    .sort((a, b) => a.hour - b.hour)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.hour).toFixed(2)} ${yFor(p[key]).toFixed(2)}`)
    .join(" ");
}

/**
 * 24-hour diurnal series for one receptor: normalized concentration vs.
 * normalized wind speed. Both series already share a 0-1 scale (see
 * dispersion.types.ts), so this is a single-axis line chart, not a
 * dual-axis one - per the dataviz method, two y-scales on one chart is
 * the #1 chart mistake, and here the data was designed to avoid it.
 * Colors: --color-primary (concentration) + --color-chart-secondary (wind
 * speed) - the project's own reserved two-series pair, CVD-checked ~23-33
 * ΔE apart, well clear of the colorblind-safety floor.
 */
export function DiurnalChart({ points, className = "" }: DiurnalChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center text-sm text-[var(--color-text-quaternary)]`}>
        No diurnal data for this receptor.
      </div>
    );
  }

  const sorted = points.slice().sort((a, b) => a.hour - b.hour);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const xSvg = xFrac * WIDTH;
    const hourFloat = ((xSvg - PAD_LEFT) / PLOT_WIDTH) * 23;
    const nearest = Math.max(0, Math.min(23, Math.round(hourFloat)));
    setHoverHour(sorted.some((p) => p.hour === nearest) ? nearest : null);
  };

  const hovered = hoverHour !== null ? sorted.find((p) => p.hour === hoverHour) : undefined;

  return (
    <div className={`${className} relative`}>
      {/* Legend - line-keys, not boxes, per the two series */}
      <div className="absolute top-0 left-0 flex items-center gap-4 text-[11px] text-[var(--color-text-tertiary)] px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded bg-[var(--color-primary)]" />
          Concentration
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded bg-[var(--color-chart-secondary)]" />
          Wind speed
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverHour(null)}
      >
        {/* Gridlines - hairline, recessive */}
        {Y_TICKS.map((v) => (
          <line
            key={v}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}

        {/* Y axis labels */}
        {Y_TICKS.map((v) => (
          <text
            key={v}
            x={PAD_LEFT - 5}
            y={yFor(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill="var(--color-text-quaternary)"
          >
            {v}
          </text>
        ))}

        {/* X axis hour ticks */}
        {X_TICK_HOURS.map((h) => (
          <text
            key={h}
            x={xFor(h)}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize={9}
            fill="var(--color-text-quaternary)"
          >
            {h}h
          </text>
        ))}

        {/* Series lines - 2px, round joins */}
        <path d={pathFor(sorted, "windSpeedNorm")} fill="none" stroke="var(--color-chart-secondary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathFor(sorted, "concentrationNorm")} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover crosshair + dots */}
        {hovered && (
          <g>
            <line
              x1={xFor(hovered.hour)}
              x2={xFor(hovered.hour)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--color-text-quaternary)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle cx={xFor(hovered.hour)} cy={yFor(hovered.concentrationNorm)} r={4} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />
            <circle cx={xFor(hovered.hour)} cy={yFor(hovered.windSpeedNorm)} r={4} fill="var(--color-chart-secondary)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}
      </svg>

      {/* Tooltip - values lead, series name follows */}
      {hovered && (
        <div
          className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[11px] shadow-lg"
          style={{
            left: `${(xFor(hovered.hour) / WIDTH) * 100}%`,
            top: `${(PAD_TOP / HEIGHT) * 100}%`,
            transform: "translate(-50%, -110%)",
          }}
        >
          <div className="font-semibold mb-0.5">{hovered.hour.toString().padStart(2, "0")}:00</div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            <span className="font-medium">{hovered.concentrationNorm.toFixed(2)}</span> concentration
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-chart-secondary)]" />
            <span className="font-medium">{hovered.windSpeedNorm.toFixed(2)}</span> wind speed
          </div>
        </div>
      )}
    </div>
  );
}
