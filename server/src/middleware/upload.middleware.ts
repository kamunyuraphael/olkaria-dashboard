import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { env } from "@/config/env.js";

// Resolved to absolute once at module load. env.UPLOAD_DIR is a relative
// path by default (./src/uploads), and a relative path here would get
// stored on each file's storedPath relative to whatever the Node process's
// cwd happens to be. The analysis-service (a separate Python process, run
// from analysis-service/, a sibling of this server/ folder) would then
// resolve that same relative string against ITS OWN cwd and never find the
// file. Storing an absolute path makes storedPath resolvable from any
// process on this machine, regardless of where it was started from.
const UPLOAD_DIR_ABS = path.resolve(env.UPLOAD_DIR);
fs.mkdirSync(UPLOAD_DIR_ABS, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR_ABS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

/**
 * Supported data-file formats — mirrors app/src/lib/fileFormats.ts. CSV,
 * TSV, and both Excel formats cover everything pandas' read_csv/read_excel
 * handle natively, and everything the CO2 ANN / AERMOD notebooks actually
 * take as input.
 *
 * This is a FIRST-PASS filter only, by extension (checked case-
 * insensitively). It is not, and cannot be, the real validation:
 *   - A file extension is just a name — nothing stops a client renaming
 *     any file to ".csv". This filter exists to reject obviously-wrong
 *     uploads early with a clear error, not to guarantee the file is
 *     actually parseable.
 *   - The real validation is content-based and happens when the
 *     analysis-service actually tries to parse the file (pandas raising
 *     on a malformed/mislabeled file). That failure surfaces through the
 *     normal job-failure path: the worker's AnalysisJob.stage becomes
 *     "failed" with a readable failureReason, which GET /jobs/:jobId
 *     returns as { stage: "failed", error }. The frontend already renders
 *     that in its "Analysis failed" state — see useUploadAnalysis.ts.
 *   - We deliberately did NOT add a magic-byte/content-sniffing check
 *     (e.g. file-type) at the upload layer. It would add a dependency and
 *     complexity to catch the same failure the analysis-service already
 *     reports correctly, just a few seconds later and with less specific
 *     information than a real parse error gives.
 */
const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".xlsx", ".xls"];

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new Error(`Unsupported file type "${ext || "unknown"}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`));
    return;
  }
  cb(null, true);
}

// 25 MB per file is generous for the CSV/Excel inputs these modules take.
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});
