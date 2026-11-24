import { Redis } from "ioredis";
import { env } from "@/config/env.js";

// maxRetriesPerRequest must be null - BullMQ requires this on the connection
// it's handed, otherwise it throws at queue/worker construction time.
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// ioredis treats an unhandled "error" event as an uncaught exception and
// crashes the process. Without this listener, a dropped/expired connection
// (e.g. a free-tier Redis closing an idle link) takes the whole server or
// worker process down with zero logged explanation - tsx watch can even
// relaunch it quietly enough that nothing visibly "crashed". This at least
// prints what actually happened.
redisConnection.on("error", (err) => {
  console.error("[redis] connection error:", err);
});
