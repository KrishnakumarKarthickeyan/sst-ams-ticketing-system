/**
 * Minimal in-memory fixed-window rate limiter — right-sized for a single-instance,
 * ≤100-user internal tool. No Redis/Upstash: one Map in the server process is
 * sufficient at this scale and has zero infra cost. Used to blunt brute-force /
 * abuse on the sensitive password endpoints.
 *
 * Pure and deterministic (inject `now`) so the window logic is unit-tested.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  const now = opts.now ?? Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= opts.limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, remaining: opts.limit - existing.count, retryAfterSec: 0 };
}

/** Best-effort client IP from proxy headers (Vercel/Next sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** Route-handler convenience: limit by `name:ip`. */
export function checkRateLimit(
  request: Request,
  name: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  return rateLimit(`${name}:${clientIp(request)}`, { limit, windowMs });
}

/** Test-only: clear the window store. */
export function __resetRateLimitStore(): void {
  store.clear();
}
