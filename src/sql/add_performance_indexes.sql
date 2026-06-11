-- MIGRATION: Performance Optimization Indexes
-- Run this in your Supabase SQL Editor.

-- Index to optimize profiles organization lookup (session loads)
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON public.profiles(organization_id);

-- Indexes to optimize ticket assignments and workloads
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_consultant ON public.ticket_assignments(consultant_id);

-- Indexes to optimize estimates lookup and RLS checks
CREATE INDEX IF NOT EXISTS idx_ticket_estimates_ticket ON public.ticket_estimates(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_estimates_consultant ON public.ticket_estimates(consultant_id);

-- Index to optimize hour estimates table lookup
CREATE INDEX IF NOT EXISTS idx_ticket_hour_estimates_ticket ON public.ticket_hour_estimates(ticket_id);

-- Index to optimize ticket closure requests table lookup
CREATE INDEX IF NOT EXISTS idx_ticket_closure_requests_ticket ON public.ticket_closure_requests(ticket_id);

-- Indexes to optimize actual hours logs and RLS checks
CREATE INDEX IF NOT EXISTS idx_ticket_actual_hours_ticket ON public.ticket_actual_hours(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_actual_hours_consultant ON public.ticket_actual_hours(consultant_id);
