import type { Gas } from "@/models/analysis.types";

/** Column header used for the gas reading in the uploaded file. */
export const GAS_COLUMN: Record<Gas, string> = { SO2: "so2", CH4: "ch4", CO2: "co2" };

export const UPLOAD_REQUIREMENTS =
  "One file with a date column, the gas reading, and temperature, wind speed, pressure and precipitation. " +
  "Daily records (hourly is averaged to daily); at least 205 days.";

/** Builds a tiny example CSV so researchers can see the exact headers expected. */
export function templateCsv(gas: Gas): string {
  const g = GAS_COLUMN[gas];
  const example: Record<Gas, string[]> = {
    CO2: ["412.4", "412.9", "413.1"],
    CH4: ["1902.3", "1903.1", "1901.8"],
    SO2: ["8.4", "9.1", "7.8"],
  };
  const rows = ["2024-01-01", "2024-01-02", "2024-01-03"].map(
    (d, i) => `${d},${example[gas][i]},21.5,3.2,845.1,0.0`
  );
  return [`date,${g},temperature,ws,pressure,precipitation`, ...rows].join("\n") + "\n";
}

export function downloadTemplate(gas: Gas): void {
  const blob = new Blob([templateCsv(gas)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${GAS_COLUMN[gas]}-upload-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
