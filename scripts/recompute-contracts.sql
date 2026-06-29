-- =============================================================================
--  RECOMPUTE CONTRACTS — set the contract window to 01/07/2026–31/12/2026 and
--  recompute the total contract hours as (monthly allocation × 6 months).
--  *** RUN MANUALLY *** in the Supabase SQL editor. DO NOT auto-execute.
-- -----------------------------------------------------------------------------
--  Applies to ALL rows in public.customer_contracts:
--    • start_date          = contract_start_date = '2026-07-01'   (dual-write)
--    • end_date            = contract_end_date   = '2026-12-31'   (dual-write)
--    • monthly_allocated_hours .................. KEPT as entered (NOT changed)
--    • total_contract_hours = total_hours = monthly_allocated_hours × 6 (dual-write,
--      6 = number of whole months Jul–Dec 2026 inclusive)
--    • status .................................. KEPT as-is (NOT changed)
--
--  Why dual-write: the frontend (src/context/TicketContext.tsx) reads the NEW
--  columns first and falls back to the legacy ones —
--      startDate  = contract_start_date || start_date
--      endDate    = contract_end_date   || end_date
--      totalHours = total_contract_hours ?? total_hours
--      monthly    = monthly_allocated_hours ?? monthly_budget_hours
--  so BOTH the new and legacy columns must agree for the dashboard/contract views
--  to show the new dates and recomputed totals with no code change. A BEFORE
--  trigger also keeps the dual columns in sync, but we set both explicitly so the
--  result is deterministic regardless of trigger behaviour.
--
--  The effective monthly used for the total is COALESCE(monthly_allocated_hours,
--  monthly_budget_hours, 0) so legacy-only rows (where the new monthly column was
--  never populated) still compute a correct total. monthly_allocated_hours itself
--  is left untouched.
-- =============================================================================

-- ── PART A — PRE-CHECK (READ-ONLY): current values + the total we will write ──
SELECT 'PRE' AS phase,
       id,
       organization_id,
       start_date, contract_start_date,
       end_date,   contract_end_date,
       monthly_allocated_hours, monthly_budget_hours,
       total_hours, total_contract_hours,
       status,
       (COALESCE(monthly_allocated_hours, monthly_budget_hours, 0) * 6) AS computed_total_hours
  FROM public.customer_contracts
 ORDER BY organization_id;

-- ── PART B — APPLY (dual-write dates + recomputed totals; monthly + status kept) ─
UPDATE public.customer_contracts
   SET start_date           = DATE '2026-07-01',
       contract_start_date  = DATE '2026-07-01',
       end_date             = DATE '2026-12-31',
       contract_end_date    = DATE '2026-12-31',
       total_hours          = COALESCE(monthly_allocated_hours, monthly_budget_hours, 0) * 6,
       total_contract_hours = COALESCE(monthly_allocated_hours, monthly_budget_hours, 0) * 6
 WHERE TRUE;  -- ALL contracts
       -- monthly_allocated_hours, monthly_budget_hours and status are intentionally NOT in SET.

-- ── PART C — POST-VERIFY (READ-ONLY): dates set, totals = monthly × 6, monthly kept ─
SELECT 'POST' AS phase,
       id,
       organization_id,
       start_date, contract_start_date,           -- both expect 2026-07-01
       end_date,   contract_end_date,             -- both expect 2026-12-31
       monthly_allocated_hours,                   -- unchanged
       total_hours, total_contract_hours,         -- both = monthly × 6
       status,                                    -- unchanged
       (total_hours = COALESCE(monthly_allocated_hours, monthly_budget_hours, 0) * 6
        AND total_contract_hours = total_hours
        AND start_date = DATE '2026-07-01' AND contract_start_date = DATE '2026-07-01'
        AND end_date = DATE '2026-12-31' AND contract_end_date = DATE '2026-12-31') AS ok
  FROM public.customer_contracts
 ORDER BY organization_id;
