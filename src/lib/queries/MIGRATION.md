# TicketContext → React Query migration (strangler-fig)

**Status:** foundation in place, **0 pages migrated**. The 6,400-line
`TicketContext` remains the source of truth. Migrate incrementally — each step
is independently shippable and CI-gated. **Do not big-bang this.**

## Why
`TicketContext.fetchData` loads *all* tickets (17 nested relations) + all
profiles + contracts + notifications on every app load, for every role, then
pages filter the in-memory array. Fine at hundreds of rows (verified: indexed,
~180ms); it does not scale to thousands. React Query gives per-entity caching,
server-side pagination, and targeted invalidation.

## What exists now (additive, nothing forced)
- `query-provider.tsx` — `QueryProvider` wraps the app (outermost in layout).
  Existing providers untouched.
- `keys.ts` — central query-key factory for consistent invalidation.
- `use-tickets-page.ts` — `useTicketsPage()`: server-side paginated, RLS-scoped,
  lean LIST projection (no nested relations). The scale mechanism.

## Migration order (lowest risk first, AFTER go-live)
1. **Ticket list pages** (`/admin/tickets`, `/manager/tickets`,
   `/customer/tickets`, `/consultant/my-tickets`) → swap `useTickets()` array
   filtering for `useTicketsPage()` + the existing `DataTable` pagination.
   Highest scale payoff, self-contained.
2. **Reference reads** (profiles, contracts) → `useProfiles()`, `useContracts()`
   hooks with long staleTime.
3. **Ticket detail** → `useTicketDetail(id)` (keeps the nested relations, but
   one ticket at a time).
4. **Mutations** → wrap status/assign/approve actions, invalidate `qk.tickets.*`
   instead of refetching everything. Retire `debouncedRefetch`.
5. **Realtime** → on a postgres_changes event, `queryClient.invalidateQueries`
   the affected key instead of a full refetch.
6. Once all reads are migrated, thin `TicketContext` to auth/session glue only.

## Rules
- One page per PR. Build + `npm test` green. Verify the page renders + numbers
  match before/after. Never migrate a page you can't visually verify.
- RLS still scopes every query server-side — never widen a select.
