import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  ANALYSIS_SERVICE_URL: z.string().optional(),
  // Shared secret sent as X-Service-Token; must match the analysis-service's
  // ANALYSIS_SERVICE_TOKEN. Required in practice once that service is public.
  ANALYSIS_SERVICE_TOKEN: z.string().optional(),
  // Free hosting: run the BullMQ workers inside the API process instead of a
  // separate (paid) worker service. Also keeps uploads on one filesystem.
  RUN_WORKERS_IN_PROCESS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  UPLOAD_DIR: z.string().default("./src/uploads"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
