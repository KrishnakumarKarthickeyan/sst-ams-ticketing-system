'use client';

import { useEffect } from 'react';
import { logError } from '../../lib/observability/log-error';

/**
 * Captures uncaught errors and unhandled promise rejections that escape React's
 * error boundaries (e.g. async event handlers, timers) and routes them through
 * the central logError sink. Renders nothing. Mount once near the app root.
 */
export function ErrorListener() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      logError(e.error ?? e.message, { source: 'window:error' });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      logError(e.reason, { source: 'window:unhandledrejection' });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
