import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, __resetRateLimitStore } from './rate-limit';

beforeEach(() => __resetRateLimitStore());

describe('rateLimit (fixed window)', () => {
  it('allows up to the limit, then blocks', () => {
    const opts = { limit: 3, windowMs: 60_000, now: 1000 };
    expect(rateLimit('k', opts).allowed).toBe(true);  // 1
    expect(rateLimit('k', opts).allowed).toBe(true);  // 2
    expect(rateLimit('k', opts).allowed).toBe(true);  // 3
    const blocked = rateLimit('k', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    expect(rateLimit('k', { limit: 1, windowMs: 1000, now: 0 }).allowed).toBe(true);
    expect(rateLimit('k', { limit: 1, windowMs: 1000, now: 500 }).allowed).toBe(false);
    expect(rateLimit('k', { limit: 1, windowMs: 1000, now: 1001 }).allowed).toBe(true); // window rolled
  });

  it('isolates buckets by key (per IP/route)', () => {
    const opts = { limit: 1, windowMs: 60_000, now: 0 };
    expect(rateLimit('a', opts).allowed).toBe(true);
    expect(rateLimit('b', opts).allowed).toBe(true); // different key unaffected
    expect(rateLimit('a', opts).allowed).toBe(false);
  });

  it('reports decreasing remaining', () => {
    const opts = { limit: 5, windowMs: 60_000, now: 0 };
    expect(rateLimit('k', opts).remaining).toBe(4);
    expect(rateLimit('k', opts).remaining).toBe(3);
  });
});
