import { connectDb } from "@/config/db.js";
import { startCo2AnnWorker } from "@/workers/co2Ann.worker.js";
import { startDispersionWorker } from "@/workers/dispersion.worker.js";

/**
 * Separate process from server.ts on purpose: a stray 8-10 minute AERMOD
 * run shouldn't share an event loop (or a restart) with the HTTP API. Run
 * `npm run dev` and `npm run worker` side by side in development; deploy
 * as two processes/services in production.
 */
async function main() {
  await connectDb();
  const co2AnnWorker = startCo2AnnWorker();
  const dispersionWorker = startDispersionWorker();
  console.log("[worker] co2-ann and dispersion workers running");

  process.on("SIGTERM", async () => {
    await Promise.all([co2AnnWorker.close(), dispersionWorker.close()]);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal worker startup error:", err);
  process.exit(1);
});
