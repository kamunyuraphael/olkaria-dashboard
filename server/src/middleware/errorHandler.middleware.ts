import type { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";

/**
 * Central error handler — primarily here to turn multer failures (our
 * upload.middleware.ts fileFilter rejection, or its file-size limit) into
 * a clean 400 with a readable message, instead of Express's default 500 +
 * stack trace. Any other thrown error still gets a generic 500; this is
 * not a substitute for proper error handling in each route, just a safety
 * net so a malformed upload fails predictably.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof Error && err.message.startsWith("Unsupported file type")) {
    return res.status(400).json({ error: err.message });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error." });
}
