'use client';

import React, { useEffect } from 'react';
import { logError } from '@/lib/observability/log-error';

/**
 * Last-resort boundary for errors thrown in the root layout itself. Must render
 * its own <html>/<body> because it replaces the entire document. Kept minimal
 * and dependency-free so it works even when the app shell is broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { source: 'global-error', digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#fafafa',
          color: '#09090b',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            margin: 16,
            padding: 32,
            textAlign: 'center',
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: 16,
            boxShadow: '0 24px 48px -12px rgba(16,24,40,0.18)',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>The application hit an error</h1>
          <p style={{ fontSize: 13, color: '#52525b', marginTop: 8 }}>
            Please reload the page. If it keeps happening, contact your administrator.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: '#a1a1aa', marginTop: 12, fontVariantNumeric: 'tabular-nums' }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: '#ffffff',
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
