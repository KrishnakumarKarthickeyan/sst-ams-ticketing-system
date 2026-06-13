'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * React Query foundation (strangler-fig migration off the TicketContext
 * god-context). This wrapper is ADDITIVE — the existing Auth/Ticket providers
 * remain the source of truth. New data hooks under src/lib/queries can be
 * adopted page-by-page; nothing is forced to migrate.
 *
 * Defaults chosen for an operational dashboard: a short staleTime so data
 * feels live without a refetch storm, and no refetch-on-focus thrash.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
