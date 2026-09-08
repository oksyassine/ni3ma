// Simple in-memory rate limiter — sliding window counter per key.
// Adequate for a single-process cPanel Passenger deployment. Multi-process
// or multi-host setups would need Redis or similar; the current app runs in
// one Node worker.
//
// Buckets auto-prune every minute to avoid unbounded memory growth.

type Entry = { hits: number; resetAt: number };
const buckets = new Map<string, Entry>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
};

/**
 * Allow up to `max` events per `windowMs` per `key`. Returns whether the
 * current attempt is allowed and the time until the window resets.
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetInMs: windowMs };
  }
  if (existing.hits >= max) {
    return { allowed: false, remaining: 0, resetInMs: existing.resetAt - now };
  }
  existing.hits++;
  return { allowed: true, remaining: max - existing.hits, resetInMs: existing.resetAt - now };
}

/** Extract a best-effort client IP from the request headers.
 *  Cloudflare's `cf-connecting-ip` is trusted first because it's set by
 *  the edge and can't be spoofed by clients. Falls back to the first hop
 *  of `x-forwarded-for` (only safe when the upstream proxy strips the
 *  client-supplied header). Returns `"unknown"` if neither is present. */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown"
  );
}
