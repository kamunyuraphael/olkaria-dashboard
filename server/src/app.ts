import express from "express";
import cors from "cors";
import { env } from "@/config/env.js";
import { apiRouter } from "@/routes/index.js";
import { errorHandler } from "@/middleware/errorHandler.middleware.js";

export function createApp() {
  const app = express();

  // CLIENT_ORIGIN may list several origins, comma-separated (e.g. the Vercel
  // production URL plus a custom domain).
  const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, ""));
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", apiRouter);

  // Must be registered last — Express only routes to an error handler
  // (4-arg middleware) when something upstream calls next(err).
  app.use(errorHandler);

  return app;
}
