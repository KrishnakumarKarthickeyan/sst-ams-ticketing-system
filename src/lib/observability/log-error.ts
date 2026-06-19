/**
 * Central error sink. Writes a structured single-line record to the console AND,
 * when an ingest URL is configured, forwards the payload to an external collector
 * (Sentry tunnel, Logflare, Better Stack, or any HTTP endpoint) — set
 * NEXT_PUBLIC_ERROR_INGEST_URL to enable. Proportionate for a ≤100-user tool: no
 * heavy SDK / source-map upload, just a fire-and-forget beacon. Every boundary
 * and catch site routes here, plus the global window handlers (ErrorListener).
 */
export interface ErrorContext {
  /** where it happened, e.g. 'global-error', 'route-error', 'mutation:closeTicket' */
  source: string;
  digest?: string;
  [key: string]: unknown;
}

/** Fire-and-forget forward to an optional external collector. Never throws. */
function forward(payload: unknown): void {
  const url = process.env.NEXT_PUBLIC_ERROR_INGEST_URL;
  if (!url) return;
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, body);
    } else {
      void fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* logging must never throw */
  }
}

export function logError(error: unknown, context: ErrorContext): void {
  const payload = {
    level: 'error' as const,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  // Structured single-line record — greppable in logs.
  // eslint-disable-next-line no-console
  console.error('[assist360:error]', JSON.stringify(payload));

  // Forward to an external collector when configured (no-op otherwise).
  forward(payload);
}
