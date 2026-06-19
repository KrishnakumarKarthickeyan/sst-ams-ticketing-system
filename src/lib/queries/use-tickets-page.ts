'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { qk } from './keys';

/**
 * Server-side paginated, RLS-scoped ticket LIST query — the scale mechanism
 * the load-everything context lacks. This is a LEAN list projection (no 17
 * nested relations): exactly what list/table views need, and what keeps the
 * query fast as ticket volume grows to thousands.
 *
 * ADDITIVE: no existing page is wired to this yet. List pages migrate onto it
 * one at a time (post go-live), each swapping `useTickets()` array-filtering
 * for `.range()` pagination + count. RLS still scopes every row server-side.
 */
export interface TicketListRow {
  id: string;
  ticket_number: string | null;
  title: string;
  status: string;
  priority: string;
  sap_module: string | null;
  organization_id: string | null;
  assigned_consultant_id: string | null;
  assigned_manager_id: string | null;
  sla_due_at: string | null;
  escalation_flag: boolean | null;
  created_at: string;
}

export interface TicketsPageParams {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  organizationId?: string;
  search?: string;
  sortColumn?: TicketSortColumn;
  sortDir?: 'asc' | 'desc';
  enabled?: boolean;
}

export interface TicketsPageResult {
  rows: TicketListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Columns the list may be sorted by server-side (whitelist — never trust raw input). */
export const TICKET_SORT_COLUMNS = [
  'created_at', 'sla_due_at', 'priority', 'status', 'ticket_number',
] as const;
export type TicketSortColumn = (typeof TICKET_SORT_COLUMNS)[number];

/** Resolve a requested sort column to a safe whitelisted one (default created_at). */
export function safeSortColumn(col?: string): TicketSortColumn {
  return (TICKET_SORT_COLUMNS as readonly string[]).includes(col ?? '')
    ? (col as TicketSortColumn)
    : 'created_at';
}

/** Inclusive [from,to] row bounds for a zero-based page. Pure + tested. */
export function pageBounds(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(0, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const from = safePage * safeSize;
  return { from, to: from + safeSize - 1 };
}

/** Total page count for a row total (always ≥ 1). Pure + tested. */
export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

const LIST_COLUMNS =
  'id, ticket_number, title, status, priority, sap_module, organization_id, assigned_consultant_id, assigned_manager_id, sla_due_at, escalation_flag, created_at';

export function useTicketsPage(params: TicketsPageParams = {}) {
  const {
    page = 0, pageSize = 25, status, priority, organizationId, search,
    sortColumn, sortDir = 'desc', enabled = true,
  } = params;
  const col = safeSortColumn(sortColumn);

  return useQuery<TicketsPageResult>({
    queryKey: qk.tickets.page({ page, pageSize, status, priority, organizationId, search, col, sortDir }),
    enabled: enabled && isSupabaseConfigured && !!supabase,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { from, to } = pageBounds(page, pageSize);

      let q = supabase
        .from('tickets')
        .select(LIST_COLUMNS, { count: 'exact' })
        .order(col, { ascending: sortDir === 'asc' })
        .range(from, to);

      if (status && status !== 'All') q = q.eq('status', status);
      if (priority && priority !== 'All') q = q.eq('priority', priority);
      if (organizationId && organizationId !== 'All') q = q.eq('organization_id', organizationId);
      if (search && search.trim()) {
        const s = search.trim();
        q = q.or(`title.ilike.%${s}%,ticket_number.ilike.%${s}%`);
      }

      const { data, count, error } = await q;
      if (error) throw error;

      const total = count ?? 0;
      return {
        rows: (data ?? []) as TicketListRow[],
        total,
        page,
        pageSize,
        pageCount: pageCountFor(total, pageSize),
      };
    },
  });
}
