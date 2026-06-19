-- ============================================================================
-- Dashboard KPI aggregation in SQL (moves counts off the browser).
--
-- RUN MANUALLY. Output only — do NOT auto-execute.
--
-- `security invoker` so the function runs under the CALLER's RLS: each role sees
-- only the tickets it is allowed to, exactly like the rest of the app. Returns a
-- single small JSON object instead of shipping every row to the client to count.
-- Breach reads the engine-written sla_status (single source), not naive date math.
-- ============================================================================

create or replace function public.dashboard_ticket_kpis()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'total',     count(*),
    'open',      count(*) filter (where status not in ('Closed', 'Resolved')),
    'closed',    count(*) filter (where status = 'Closed'),
    'resolved',  count(*) filter (where status = 'Resolved'),
    'escalated', count(*) filter (where escalation_flag),
    'breached',  count(*) filter (where sla_status = 'Breached'),
    'atRisk',    count(*) filter (where sla_status = 'At Risk')
  )
  from public.tickets
  where soft_delete_status is distinct from 'Deleted';
$$;

grant execute on function public.dashboard_ticket_kpis() to authenticated;
