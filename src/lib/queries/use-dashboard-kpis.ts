'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../supabase/client';

/**
 * Dashboard KPIs computed in SQL via the dashboard_ticket_kpis() RPC (RLS-scoped,
 * security invoker) instead of shipping every ticket row to the browser to count.
 *
 * ADDITIVE / strangler-fig: pages adopt this the same way as use-tickets-page.ts.
 * Consumers should fall back to their existing client-side computation when the
 * query has no data yet (RPC not deployed / loading) so behaviour is unchanged
 * until the migration is applied. `retry: false` keeps the fallback instant if the
 * function does not exist yet.
 */
export interface DashboardKpis {
  total: number;
  open: number;
  closed: number;
  resolved: number;
  escalated: number;
  breached: number;
  atRisk: number;
}

export function useDashboardKpis(enabled = true) {
  return useQuery<DashboardKpis>({
    queryKey: ['dashboard', 'ticket-kpis'],
    enabled: enabled && isSupabaseConfigured && !!supabase,
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_ticket_kpis');
      if (error) throw error;
      return data as DashboardKpis;
    },
  });
}
