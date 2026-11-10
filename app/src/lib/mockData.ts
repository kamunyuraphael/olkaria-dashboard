import type { LibraryRow } from "@/models/analysis.types";

// TODO: replace with GET /api/analyses once server/ exposes it
export const LIBRARY_ROWS: LibraryRow[] = [
  { id: "r1", site: "Olkaria Site A", gas: "CH4", start: "2024-01-01", end: "2024-12-31", status: "complete", coverage: "78%" },
  { id: "r2", site: "Olkaria Site B", gas: "SO2", start: "2023-06-01", end: "2023-12-31", status: "complete", coverage: "91%" },
  { id: "r3", site: "Menengai Crater", gas: "SO2", start: "2024-03-01", end: "2024-09-30", status: "running", coverage: "54%" },
  { id: "r4", site: "Longonot Caldera", gas: "CH4", start: "2023-01-01", end: "2023-12-31", status: "failed", coverage: "—" },
];
