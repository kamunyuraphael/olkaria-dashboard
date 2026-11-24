/**
 * Shared accepted-format constant for every data-file upload slot (CO2 ANN,
 * gas dispersion). Centralized so "what formats do we accept" is one
 * decision, not a per-FileSlot copy/paste that drifts.
 *
 * Supports CSV, TSV, and both Excel formats (.xlsx, .xls) - the full set
 * pandas' read_csv/read_excel handle natively, and the realistic range of
 * what a researcher's instrument export or Excel workbook arrives as.
 * Deliberately NOT included: JSON, Parquet, or other structured formats -
 * nothing in these notebooks produces or expects them, and adding them
 * would mean a different parsing path in the analysis-service for no
 * current benefit. Add here (and in server/src/middleware/upload.middleware.ts's
 * ALLOWED_EXTENSIONS) if that ever changes.
 */
export const DATA_FILE_ACCEPT = ".csv,.tsv,.xlsx,.xls";
export const DATA_FILE_FORMAT_LABEL = "CSV, TSV, or Excel (.xlsx/.xls)";
