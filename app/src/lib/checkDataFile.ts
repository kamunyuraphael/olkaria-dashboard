import type { Gas } from "@/models/analysis.types";

export interface FileCheck {
  /** Things that will make the run fail. */
  errors: string[];
  /** Things worth knowing but not blocking. */
  warnings: string[];
  /** Short positive summary, e.g. "412 rows · 6 columns". */
  summary?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const ANN_ALIASES: Record<string, string[]> = {
  date: ["date", "datetime", "timestamp", "time", "day"],
  temperature: ["temperature", "temp", "airtemperature", "t2m"],
  ws: ["ws", "windspeed", "wind", "windspeedms"],
  pressure: ["pressure", "pres", "airpressure", "surfacepressure"],
  precipitation: ["precipitation", "precip", "rain", "rainfall", "tp"],
};

const MET_COLS = ["Year", "Month", "Day", "Hour", "Cloud Cover (Oktas)", "Wind Speed (km/h)", "Wind Direction (°)"];
const SOURCE_COLS = ["Source ID", "X Coord (m)", "Y Coord (m)", "XLength (m)", "YLength (m)", "Emission Rate (g/s)", "Release Height", "Base Elevation"];

const isTextual = (f: File) => /\.(csv|tsv|txt)$/i.test(f.name);

async function readHead(file: File) {
  const text = await file.slice(0, 400_000).text();
  const truncated = file.size > 400_000;
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (truncated) lines.pop(); // last line may be cut mid-row
  const head = lines[0] ?? "";
  const delim = [",", "\t", ";"].map((d) => [d, head.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const header = head.split(delim).map((h) => h.trim().replace(/^"|"$/g, ""));
  return { header, rows: lines.length - 1, truncated, lines, delim };
}

function emptyCheck(file: File): FileCheck | null {
  if (file.size === 0) return { errors: ["This file is empty."], warnings: [] };
  return null;
}

/** Quick in-browser look at an ANN upload so problems are caught before a multi-minute run. */
export async function checkAnnFile(file: File, gas: Gas): Promise<FileCheck | null> {
  const empty = emptyCheck(file);
  if (empty) return empty;
  if (!isTextual(file)) return null; // Excel files are checked by the server
  const { header, rows, truncated } = await readHead(file);
  const errors: string[] = [];
  const warnings: string[] = [];
  const have = new Set(header.map(norm));
  const wantGas = norm(gas);

  const find = (names: string[]) => names.some((n) => have.has(n));
  if (!find(ANN_ALIASES.date)) errors.push("No date column found (expected something like “date”).");
  if (!have.has(wantGas)) {
    const other = (["co2", "ch4", "so2"] as const).filter((g) => g !== wantGas && have.has(g));
    errors.push(
      other.length
        ? `No “${wantGas}” column — this file looks like ${other[0].toUpperCase()} data. Change the gas above or fix the header.`
        : `No “${wantGas}” column found for the gas you selected.`
    );
  }
  for (const k of ["temperature", "ws", "pressure", "precipitation"]) {
    if (!find(ANN_ALIASES[k])) errors.push(`Missing weather column “${k}”.`);
  }
  if (!truncated && rows < 205) errors.push(`Only ${rows} rows — at least 205 daily records are needed.`);
  else if (!truncated && rows < 400) warnings.push(`${rows} rows is on the short side; more history gives a steadier forecast.`);

  return { errors, warnings, summary: errors.length ? undefined : `${truncated ? "400k+ bytes" : rows + " rows"} · ${header.length} columns · looks good` };
}

function checkExact(header: string[], wanted: string[], label: string): string[] {
  const have = new Set(header.map(norm));
  const missing = wanted.filter((w) => !have.has(norm(w)));
  return missing.length ? [`${label} is missing: ${missing.join(", ")}.`] : [];
}

export async function checkMetFile(file: File): Promise<FileCheck | null> {
  const empty = emptyCheck(file);
  if (empty) return empty;
  if (!isTextual(file)) return null;
  const { header, rows } = await readHead(file);
  const errors = checkExact(header, MET_COLS, "Met data");
  const warnings: string[] = [];
  if (!errors.length && rows < 24) warnings.push("Fewer than 24 hourly rows — results will be thin.");
  return { errors, warnings, summary: errors.length ? undefined : `${rows} hourly rows · looks good` };
}

export async function checkSourcesFile(file: File): Promise<FileCheck | null> {
  const empty = emptyCheck(file);
  if (empty) return empty;
  if (!isTextual(file)) return null;
  const { header, rows } = await readHead(file);
  const errors = checkExact(header, SOURCE_COLS, "Emission sources");
  const warnings: string[] = [];
  if (!errors.length && rows < 3) errors.push("At least 3 sources are needed (terrain is interpolated between them).");
  return { errors, warnings, summary: errors.length ? undefined : `${rows} sources · looks good` };
}
