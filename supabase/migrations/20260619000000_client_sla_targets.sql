-- ============================================================================
-- Per-client SLA targets + lead-assignment timestamp + SLA status
--
-- RUN MANUALLY. This migration is OUTPUT ONLY and must NOT be executed by any
-- automated tooling. Apply it in the Supabase SQL editor / migration pipeline
-- when ready. Until it is applied, the SLA engine treats every ticket as
-- 'Not Started' (no lead_assigned_at can be persisted) — which is the correct,
-- safe default.
--
-- Business-clock contract enforced by src/lib/sla/slaEngine.ts:
--   * Timezone Asia/Kolkata (IST, UTC+5:30, no DST)
--   * Business window 10:30:00–19:30:00 IST = 9 working hours/day
--   * Business days Sunday–Thursday; Friday & Saturday OFF
--   * Timer starts only on lead-consultant assignment (lead_assigned_at)
-- ============================================================================

-- 1) Per-client SLA targets (hours per priority) ----------------------------
create table if not exists public.client_sla_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  critical_hours numeric not null default 8,
  high_hours     numeric not null default 16,
  medium_hours   numeric not null default 32,
  low_hours      numeric not null default 64,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique(organization_id)
);

alter table public.client_sla_targets enable row level security;

-- Managers/admins see & manage all; a customer may read only their own org's row.
drop policy if exists csla_select on public.client_sla_targets;
create policy csla_select on public.client_sla_targets for select to authenticated using (
  public.is_manager_or_admin()
  or organization_id = (select organization_id from public.profiles where id = auth.uid())
);

drop policy if exists csla_write on public.client_sla_targets;
create policy csla_write on public.client_sla_targets for all to authenticated
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- 2) Ticket columns: assignment timestamp + persisted SLA status ------------
alter table public.tickets
  add column if not exists lead_assigned_at timestamptz,
  add column if not exists sla_due_at timestamptz,
  add column if not exists sla_status text;   -- 'Not Started'|'On Track'|'At Risk'|'Breached'|'Met'

-- 3) Seed a default 8/16/32/64 row for every organization lacking one -------
insert into public.client_sla_targets (organization_id, critical_hours, high_hours, medium_hours, low_hours)
select o.id, 8, 16, 32, 64
from public.organizations o
where not exists (
  select 1 from public.client_sla_targets c where c.organization_id = o.id
);
