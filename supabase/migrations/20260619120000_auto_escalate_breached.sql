-- ============================================================================
-- Auto-escalation when a ticket's SLA is breached.
--
-- RUN MANUALLY. Output only — do NOT auto-execute. Enable deliberately.
--
-- `sla_due_at` is persisted by the IST business-hours engine on lead assignment
-- (addBusinessHours), so it is ALREADY business-hours-aware — a plain
-- `sla_due_at < now()` is a correct breach check; no calendar/24h drift.
--
-- The function only RAISES the escalation flag + stamps a reason/time on open,
-- assigned, not-yet-escalated tickets. It intentionally does NOT touch the
-- manual escalation lifecycle (acknowledgement, the escalations table) so it
-- can't conflict with a human-driven escalation already in flight.
-- ============================================================================

create or replace function public.escalate_breached_tickets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.tickets t
     set escalation_flag   = true,
         is_escalated      = true,
         escalated_at       = now(),
         escalation_reason  = coalesce(t.escalation_reason, 'Auto-escalated: resolution SLA breached')
   where t.escalation_flag is not true
     and t.status not in ('Closed', 'Resolved')
     and t.lead_assigned_at is not null
     and t.sla_due_at is not null
     and t.sla_due_at < now()
     and t.soft_delete_status is distinct from 'Deleted';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Schedule it (requires pg_cron, available on Supabase). Runs every 30 minutes;
-- the function is a no-op when nothing is newly breached. Safe to re-run — the
-- schedule name is unique, so this won't double-register.
-- (Uncomment to activate once pg_cron is enabled for the project.)
--
-- select cron.schedule(
--   'escalate-breached-tickets',
--   '*/30 * * * *',
--   $$ select public.escalate_breached_tickets(); $$
-- );
