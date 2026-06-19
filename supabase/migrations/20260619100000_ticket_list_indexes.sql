-- ============================================================================
-- Indexes for ticket list/range/filter performance at thousands of rows.
--
-- RUN MANUALLY. Output only — do NOT auto-execute.
--
-- These back both the current ordered load and the server-paginated list query
-- (src/lib/queries/use-tickets-page.ts: .order('created_at' desc).range() with
-- eq() filters on status/priority/organization_id). Right-sized for a ≤100-user
-- tool: a handful of B-tree indexes, no partitioning/sharding.
--
-- `if not exists` makes this idempotent and safe to re-run.
-- ============================================================================

-- Primary list ordering (newest first) — every list/range query sorts on this.
create index if not exists idx_tickets_created_at_desc
  on public.tickets (created_at desc);

-- Single-column filters used by tabs, KPIs, and the filter panel.
create index if not exists idx_tickets_status            on public.tickets (status);
create index if not exists idx_tickets_priority          on public.tickets (priority);
create index if not exists idx_tickets_organization_id   on public.tickets (organization_id);
create index if not exists idx_tickets_escalation_flag   on public.tickets (escalation_flag);

-- Common composite: an org's tickets, newest first (customer-scoped list views).
create index if not exists idx_tickets_org_created_at
  on public.tickets (organization_id, created_at desc);

-- Assignment lookups (consultant "my tickets", RLS scoping, workload).
create index if not exists idx_tickets_assigned_consultant
  on public.tickets (assigned_consultant_id);

-- SLA scans (breach lists, dashboards) — only rows that carry a real deadline.
create index if not exists idx_tickets_sla_due_at
  on public.tickets (sla_due_at)
  where sla_due_at is not null;
