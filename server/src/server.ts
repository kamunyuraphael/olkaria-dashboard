import { env } from "@/config/env.js";
import { connectDb } from "@/config/db.js";
import { createApp } from "@/app.js";
import { startCo2AnnWorker } from "@/workers/co2Ann.worker.js";
import { startDispersionWorker } from "@/workers/dispersion.worker.js";

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on :${env.PORT}`);
  });

  // Single-process mode for free hosting (see RUN_WORKERS_IN_PROCESS in
  // config/env.ts). Locally, keep running `npm run worker` separately.
  if (env.RUN_WORKERS_IN_PROCESS) {
    startCo2AnnWorker();
    startDispersionWorker();
    console.log("[server] co2-ann and dispersion workers running in-process");
  }
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
