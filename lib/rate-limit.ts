/**
 * Fixed-window rate limiter.
 *
 * • Default: in-memory (per server instance) — fine for `next start` and dev.
 * • Production on serverless: set UPSTASH_REDIS_REST_URL / _TOKEN (free tier)
 *   to share counters across instances. Uses the REST API, no extra package.
 */

export type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of memory) if (bucket.resetAt <= now) memory.delete(key);
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  return { success: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

async function upstashLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(windowMs), "NX"],
      ["PTTL", key],
    ]),
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error(`Upstash ${response.status}`);
  const [incr, , ttl] = (await response.json()) as { result: number }[];
  const count = Number(incr?.result ?? 0);
  const resetAt = Date.now() + Math.max(0, Number(ttl?.result ?? windowMs));
  return { success: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

export async function rateLimit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResult> {
  const namespaced = `rl:${key}`;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await upstashLimit(namespaced, opts.limit, opts.windowMs);
    } catch (error) {
      console.warn("[rate-limit] Upstash unavailable, using memory:", (error as Error).message);
    }
  }
  return memoryLimit(namespaced, opts.limit, opts.windowMs);
}

/** Common presets. */
export const LIMITS = {
  leadPerMinute: { limit: 5, windowMs: 60_000 },
  leadPerDay: { limit: 40, windowMs: 86_400_000 },
  signIn: { limit: 8, windowMs: 15 * 60_000 },
  signUp: { limit: 5, windowMs: 60 * 60_000 },
  api: { limit: 120, windowMs: 60_000 },
  vinLookup: { limit: 20, windowMs: 60_000 },
} as const;

/** Test helper. */
export function __resetRateLimits() {
  memory.clear();
}
