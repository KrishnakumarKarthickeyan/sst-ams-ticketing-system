'use client';

import React, { startTransition, useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/observability/log-error';

/**
 * Top-level route error boundary. Catches any uncaught render error in a route
 * segment that doesn't have its own boundary, so users see a graceful screen
 * instead of a white page — and the error is captured.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { source: 'route-error', digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-critical-border bg-surface shadow-overlay">
        <div className="h-1.5 bg-critical" />
        <div className="px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-critical-soft text-critical">
            <AlertCircle size={22} />
          </div>
          <h1 className="type-title text-ink">Something went wrong</h1>
          <p className="type-meta mt-2 text-ink-secondary">
            An unexpected error interrupted this page. You can retry, or head back to your dashboard.
          </p>
          {error.digest && (
            <p className="type-status type-num mt-3 rounded-md border border-line bg-surface-muted px-2 py-1 text-ink-muted">
              Reference: {error.digest}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => startTransition(() => reset())} className="gap-2 rounded-md">
              <RotateCcw size={14} />
              Try again
            </Button>
            <Button asChild variant="outline" className="gap-2 rounded-md">
              <Link href="/dashboard">
                <Home size={14} />
                Back to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
