# Framework Analysis — Caveman · CodeGraph · Graphify · RTL

Per `AGENTS.md`, every task follows **Caveman → CodeGraph → RTL** (Graphify on the
larger redesigns). This document retro-organises that analysis for the recent
prompts, grounded in **real tool output** (CodeGraph `impact/callers/callees/affected`
and the Graphify community rebuild), and is the standing template applied inline
going forward.

Tool baseline at time of writing: CodeGraph 0.9.9 — index 198 files / 1,945 nodes /
3,760 edges. Graphify — 1,015 nodes / 2,828 edges / 60 communities.

Known tool limits observed (so findings are read correctly):
- CodeGraph 0.9.9 does **not** index nested `const` arrow functions (e.g.
  `mapDbTicket`, `getClientTargets`, `assignTicket` live inside `TicketProvider`),
  nor resolve cross-file JSX component usage — so impact on a provider-internal
  symbol surfaces as `TicketProvider`, and `SlaTimer`'s three call sites show as 1.
- CodeGraph `affected` did not map the `*.test.ts` files to their sources; test
  coverage is asserted via the passing Vitest suite (84 tests) instead.

---

## Prompt A — Manager "Demand & Quality" (commit `1fad712`)

### Caveman
- **Problem:** Reopen Trend empty; SLA Breach panel was a dead "not tracked in
  schema" apology card; Demand-Heat legend mis-ordered (Critical·High·Low·Medium);
  bottom of the section had a dead white gap.
- **Root cause:** (1) `ticket_reopen_requests` genuinely empty (verified 0 rows) —
  empty state correct; (2) panel shipped an apology instead of using the
  resolution-SLA data that *is* tracked; (3) Recharts v3 `Legend` defaults
  `itemSorter:"value"` → alphabetical sort; (4) `col-span-2` left an unbalanced grid.
- **Current vs expected:** apology card → real "SLA Breach by Priority"; legend
  alphabetical → severity order; 3-up ragged grid → balanced 2×2.
- **Affected surfaces:** `ManagerTeamPerformance` only (analytics component); no
  API/DB/RLS/realtime/notification impact (read-only derivations).
- **Dependency risks:** shared Recharts theme tokens; risk that `itemSorter={null}`
  also changes other legends in the file — reviewed, intended.
- **Validation/regression:** `tsc` + `build`; DOM-measured 2×2 geometry; confirmed
  legend text order; no other dashboard touched.

### CodeGraph
`impact ManagerTeamPerformance` → 2 symbols (the function + its file only).
Blast radius fully contained to `src/components/analytics/manager-team-performance.tsx`.

### Graphify
Lives in the analytics community (`slaByPriority()`, `qualityStats()`,
`resolutionByPriority()` …) — self-contained; no edges into engine/context.

### RTL
1. Diagnose reopen data (DB count) — risk L — validate: print row count.
2. Replace SLA panel with breach-by-priority from `hasSlaTarget`/`slaBreached` — risk M.
3. Lock legend/stack to severity via `itemSorter={null}` — risk L.
4. Re-balance to 2×2 grid — risk L — validate: equal row heights.

---

## Prompt B — Service Desk reconciliation (commit `70657bf`)

### Caveman
- **Problem:** Tab badges, filters, and ticket cards disagreed when any filter was
  applied (e.g. SLA Breached 152/309).
- **Root cause:** badges counted the **unfiltered** scoped set; cards counted
  tab+dropdowns+search → divergence under any active filter. SLA "Active" dropdown
  value was a no-op (code handled Warning/Met which the dropdown never emits).
- **Current vs expected:** independent count paths → one filtered source; tab is one
  predicate layered on it, so `badge(activeTab) === card count` by construction.
- **Affected surfaces:** `ManagerTicketsPage` + new pure `manager-desk-predicates`;
  no DB/RLS/realtime change. SLA 152/309 verified **real** (Closed+Resolved excluded).
- **Dependency risks:** predicate casing must match mapped model values — unit-tested.
- **Validation/regression:** `tsc`+`build`+15 unit tests; reconciliation harness vs
  live DB for no-filter, Customer, Status=Closed, Priority=Critical — all equal.

### CodeGraph
`impact isSlaBreached` → `matchesTab`, `ManagerTicketsPage`.
`callers matchesTab` → `ManagerTicketsPage` (1). `callers isUnassigned` →
`ManagerTicketsPage`, `matchesTab`. Radius = the manager desk only; predicates are
a clean leaf module.

### Graphify
New community: `hasPendingApproval()`, `isSlaBreached()`, `isUnassigned()`,
`matchesTab()`, `ManagerDeskTab` — cohesive predicate cluster, no leakage.

### RTL
1. Define single `deskFilteredTickets` (all dropdowns+search+date) — risk M.
2. Extract canonical predicates to tested lib module — risk L.
3. Derive badges + card list from the one source — risk M — validate: harness.
4. Fix SLA "Active" no-op — risk L.

---

## Prompt C — Per-client IST business-hours SLA timer (commits `f4ff730`…`43b8a87`)

### Caveman
- **Problem:** Need per-client SLA targets and a countdown on the IST business clock
  (10:30–19:30, Sun–Thu), paused off-hours/weekends, started on lead assignment,
  shown on the board and in the ticket for every role.
- **Root cause / gap:** old `addSlaHours` was naive 24h/day, server-local TZ; no
  per-client targets; no assignment timestamp; no live timer.
- **Current vs expected:** naive calendar math → fixed-offset IST business-hours
  engine; static badge → live per-minute timer with paused states; one global SLA →
  per-client targets table.
- **Affected surfaces:** **DB** (`client_sla_targets`, `tickets.lead_assigned_at`,
  `tickets.sla_status`) — migration RUN MANUALLY; **RLS** (`is_manager_or_admin()` +
  own-org read); **context** (`mapDbTicket`, `assignTicket`, targets load/upsert);
  **components** (`SlaTimer`, `ClientSlaTargetsCard`, manager desk, both detail
  views, create-client dialog); **server action** `provisionUser` (auto-seed);
  **reconciliation** (`isSlaBreached` now reads engine `slaStatus`).
- **Dependency risks:** (1) migration not yet applied → guarded writes so assignment
  never breaks; (2) breach semantics change (unassigned = Not Started → SLA Breached
  tab reads engine, was 152) — intended, reconciliation invariant preserved;
  (3) IST fixed offset valid only because IST has no DST — documented.
- **Validation/regression:** `tsc`+`build`+16 engine tests (incl. Critical 8h Thu
  18:00 IST → Sun 17:00 IST) + full 84-test suite; live-DB migration verify (12/12
  orgs seeded, both columns present).

### CodeGraph (real output)
- `impact computeSla` → `SlaTimer`, `TicketProvider` (the provider-internal
  `mapDbTicket`/`assignTicket`/`upsert`), self.
- `impact addBusinessHours` → `computeSla`, `SlaTimer`, `TicketProvider`.
- `callees computeSla` → `addBusinessHours`, `isClosedStatus`, `businessHoursBetween`,
  `isBusinessOpenNow`, `SlaTicketInput`, `SlaComputation` (pure engine internals — no
  outward coupling).
- `impact isSlaBreached` → `matchesTab`, `ManagerTicketsPage` (reconciliation intact).
- `affected` (4 changed files) → no test files linked (tool gap; suite passes).

### Graphify
SLA engine is its own community (32 nodes: `addBusinessHours`, `businessHoursBetween`,
`computeSla`, `businessWindowFor`, `ClientSlaTargets`, `DEFAULT_SLA_TARGETS`,
`dowOfDayIndex`, `formatBusinessDuration` …) — confirms the engine is a cohesive,
isolated module with edges only to its UI consumers, not tangled into unrelated code.

### RTL (the 5 shipped stages)
1. Migration: `client_sla_targets` + `lead_assigned_at`/`sla_status` + seed — risk M —
   OUTPUT ONLY.
2. Engine `slaEngine.ts` (IST math) + tests; persist on assignment — risk M —
   validate: worked examples.
3. Shared `SlaTimer` (live, paused states) — risk L.
4. Surface on cards + detail headers; `slaStatus` single source — risk M — validate:
   reconciliation preserved.
5. Per-client target management (create/edit/read-only) — risk L.

---

## Standing process (applied inline from here)

For each new prompt: emit the **Caveman** block → run `codegraph sync` then
`impact/callers/callees/affected` on the touched symbols **before** editing →
write the numbered **RTL** → implement → validate → `codegraph sync` (and
`npm run graphify` for engine/dashboard/workflow/DB redesigns).
