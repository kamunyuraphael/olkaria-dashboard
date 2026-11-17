import type { Request, Response, NextFunction } from "express";

/** Tiny in-memory limiter (single instance is fine for this deployment). */
export function rateLimit({ windowMs, max, key }: { windowMs: number; max: number; key: (req: Request) => string }) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const k = key(req);
    const h = hits.get(k);
    if (!h || h.reset < now) {
      hits.set(k, { n: 1, reset: now + windowMs });
    } else if (++h.n > max) {
      res.setHeader("Retry-After", String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: "Too many attempts. Please wait a few minutes and try again." });
    }
    if (hits.size > 5000) for (const [kk, v] of hits) if (v.reset < now) hits.delete(kk);
    next();
  };
}
