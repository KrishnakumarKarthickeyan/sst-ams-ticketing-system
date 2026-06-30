-- =============================================================================
--  BASAMH SLA TARGETS → Critical 4h · High 8h · Medium 16h · Low 32h
--  *** RUN MANUALLY in the Supabase SQL editor. ***
-- -----------------------------------------------------------------------------
--  Single source of truth: every role/surface reads SLA from public.client_sla_targets
--  via the SLA engine — TicketContext loads slaTargetsByOrg from this table, getClientTargets
--  (organizationId) → engine getTargetHours(priority, targets). The create-ticket Incident
--  panel, the SLA Governance panel, the SlaTimer and the breach tab/KPI all read it; the only
--  fallback is DEFAULT_SLA_TARGETS (8/16/32/64) when a client has no row. There are NO hardcoded
--  BASAMH SLA values anywhere in code, so this one row makes 4/8/16/32 apply everywhere, for
--  every role, automatically. Touches ONLY BASAMH.
-- =============================================================================

-- ── STEP 1 — CONFIRM the target org (READ-ONLY). Verify this is the right BASAMH. ──
-- Expected (this environment): id = 4b94d712-5373-4a7f-a292-b0e2822411ac, short_code = BAS.
SELECT id AS organization_id, name, customer_short_code
  FROM public.organizations
 WHERE name = 'BASAMH';   -- if your org name differs, use ILIKE '%BASAMH%' and confirm one row

-- ── STEP 2 — UPSERT BASAMH's per-client SLA targets ──────────────────────────
-- Robust update-or-insert keyed on the org (no dependency on a named unique constraint):
-- BASAMH already has a row, so the UPDATE applies; the INSERT is a no-op safety net for the
-- case where the row is absent.
UPDATE public.client_sla_targets
   SET critical_hours = 4,
       high_hours     = 8,
       medium_hours   = 16,
       low_hours      = 32,
       updated_at     = now()
 WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'BASAMH');

INSERT INTO public.client_sla_targets (organization_id, critical_hours, high_hours, medium_hours, low_hours, updated_at)
SELECT o.id, 4, 8, 16, 32, now()
  FROM public.organizations o
 WHERE o.name = 'BASAMH'
   AND NOT EXISTS (
     SELECT 1 FROM public.client_sla_targets c WHERE c.organization_id = o.id
   );

-- ── STEP 3 — POST-VERIFY (READ-ONLY): BASAMH = 4/8/16/32, no other client changed ──
SELECT o.name,
       c.critical_hours, c.high_hours, c.medium_hours, c.low_hours, c.updated_at,
       (c.critical_hours = 4 AND c.high_hours = 8 AND c.medium_hours = 16 AND c.low_hours = 32) AS ok
  FROM public.client_sla_targets c
  JOIN public.organizations o ON o.id = c.organization_id
 WHERE o.name = 'BASAMH';
