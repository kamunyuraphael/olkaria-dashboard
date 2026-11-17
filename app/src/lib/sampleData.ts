import type { Gas } from "@/models/analysis.types";
import type { DispersionGas } from "@/models/dispersion.types";
import { GAS_COLUMN } from "@/lib/uploadTemplate";

// Deterministic pseudo-random so the sample is the same every time.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const BASE: Record<Gas, { mean: number; amp: number; noise: number }> = {
  CO2: { mean: 415, amp: 4, noise: 0.8 },
  CH4: { mean: 1900, amp: 25, noise: 6 },
  SO2: { mean: 9, amp: 2.5, noise: 0.8 },
};

/** ~14 months of made-up daily readings in the exact upload format. For trying the tool out only. */
export function sampleAnnCsv(gas: Gas): string {
  const r = rng(7);
  const b = BASE[gas];
  const start = Date.UTC(2023, 0, 1);
  const rows = [`date,${GAS_COLUMN[gas]},temperature,ws,pressure,precipitation`];
  for (let i = 0; i < 420; i++) {
    const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
    const season = Math.sin((i / 365) * 2 * Math.PI);
    const temp = 19 + 3 * season + (r() - 0.5) * 3;
    const ws = Math.max(0.3, 3 + 1.2 * Math.sin(i / 9) + (r() - 0.5) * 1.5);
    const pres = 845 + 2 * season + (r() - 0.5) * 2;
    const rain = r() < 0.2 ? r() * 8 : 0;
    const gasV = b.mean + b.amp * season - 0.6 * (ws - 3) * (b.amp / 4) + 0.2 * (temp - 19) + (r() - 0.5) * b.noise * 2;
    rows.push([d, gasV.toFixed(2), temp.toFixed(1), ws.toFixed(2), pres.toFixed(1), rain.toFixed(1)].join(","));
  }
  return rows.join("\n") + "\n";
}

/** Three days of hourly weather in the dispersion met-data format. */
export function sampleMetCsv(): string {
  const r = rng(11);
  const rows = ["Year,Month,Day,Hour,Cloud Cover (Oktas),Wind Speed (km/h),Wind Direction (°)"];
  for (let day = 1; day <= 3; day++) {
    for (let h = 0; h < 24; h++) {
      const cloud = Math.round(2 + 3 * Math.sin(h / 4) + r() * 2);
      const wind = (8 + 6 * Math.sin((h - 6) / 24 * 2 * Math.PI) + r() * 3).toFixed(1);
      const dir = Math.round(70 + 40 * Math.sin(h / 8) + r() * 20);
      rows.push(`24,6,${day},${h},${Math.min(8, Math.max(0, cloud))},${wind},${dir}`);
    }
  }
  return rows.join("\n") + "\n";
}

/** Four small area sources (local metre coordinates) in the dispersion source format. */
export function sampleSourcesCsv(gas: DispersionGas): string {
  const scale = gas === "H2S" ? 0.02 : gas === "CH4" ? 0.5 : 2;
  const pts: [number, number, number][] = [
    [1000, 1000, 1], [1400, 1100, 1.6], [1200, 1500, 0.8], [900, 1400, 1.2],
  ];
  const rows = ["Source ID,X Coord (m),Y Coord (m),XLength (m),YLength (m),Emission Rate (g/s),Release Height,Base Elevation"];
  pts.forEach(([x, y, q], i) => {
    rows.push(`S${i + 1},${x},${y},100,100,${(q * scale).toFixed(3)},10,${2000 + i * 5}`);
  });
  return rows.join("\n") + "\n";
}

export function csvFile(name: string, text: string): File {
  return new File([text], name, { type: "text/csv" });
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
