/**
 * Central client-side error sink. Today it writes a structured record to the
 * console; when an error-tracking service (e.g. Sentry) is added, swap the body
 * of this one function — every boundary and catch site already routes here.
 */
export interface ErrorContext {
  /** where it happened, e.g. 'global-error', 'route-error', 'mutation:closeTicket' */
  source: string;
  digest?: string;
  [key: string]: unknown;
}

export function logError(error: unknown, context: ErrorContext): void {
  const payload = {
    level: 'error' as const,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  // Structured single-line record — greppable in logs and ready to forward.
  // eslint-disable-next-line no-console
  console.error('[assist360:error]', JSON.stringify(payload));

  // ── Wire an error-tracking service here when ready, e.g.:
  //   import * as Sentry from '@sentry/nextjs';
  //   Sentry.captureException(error, { extra: context });
}
