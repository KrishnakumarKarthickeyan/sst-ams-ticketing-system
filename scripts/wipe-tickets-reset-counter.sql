-- =============================================================================
--  WIPE TICKETS + RESTART NUMBERING AT 1
--  *** RUN MANUALLY in the Supabase SQL editor — IRREVERSIBLE. Back up first. ***
-- -----------------------------------------------------------------------------
--  Scope: TICKETS ONLY. Deletes every ticket + all ticket-child rows and ticket-
--  related notifications, then restarts the ticket-number sequence so the next
--  ticket is <SHORTCODE>-<MODULE>-000001.
--
--  KEEPS (NOT touched): organizations / clients, customer_contracts, client_sla_targets,
--  profiles (consultants / managers / SuperAdmins), auth.users. This is NOT a client wipe.
--
--  Ticket-number mechanism (verified in supabase/migrations/
--  20260602000001_ticket_sequence_and_numbering.sql):
--    • Global sequence  public.ticket_sequence_seq  (START WITH 1)
--    • BEFORE INSERT trigger trg_generate_ticket_number → generate_ticket_number_trigger()
--      sets  NEW.ticket_sequence := nextval('public.ticket_sequence_seq')  and
--            NEW.ticket_number  := <customer_short_code> || '-' || <primary_module> || '-' ||
--                                   LPAD(seq::text, 6, '0')   e.g.  BAS-FICO-000001
--  → Reset = restart that one sequence. (The per-row tickets.ticket_sequence column is
--    populated by the trigger; no separate counter table exists.)
-- =============================================================================

-- ── PART A — PRE-COUNT (READ-ONLY) ───────────────────────────────────────────
SELECT 'PRE' AS phase, 'tickets' AS table_name, count(*)::text AS rows FROM public.tickets
UNION ALL SELECT 'PRE','ticket_actual_hours',         count(*)::text FROM public.ticket_actual_hours
UNION ALL SELECT 'PRE','ticket_closure_requests',     count(*)::text FROM public.ticket_closure_requests
UNION ALL SELECT 'PRE','ticket_reopen_requests',      count(*)::text FROM public.ticket_reopen_requests
UNION ALL SELECT 'PRE','ticket_comments',             count(*)::text FROM public.ticket_comments
UNION ALL SELECT 'PRE','ticket_comment_attachments',  count(*)::text FROM public.ticket_comment_attachments
UNION ALL SELECT 'PRE','ticket_attachments',          count(*)::text FROM public.ticket_attachments
UNION ALL SELECT 'PRE','ticket_assignments',          count(*)::text FROM public.ticket_assignments
UNION ALL SELECT 'PRE','ticket_estimates',            count(*)::text FROM public.ticket_estimates
UNION ALL SELECT 'PRE','ticket_hour_estimates',       count(*)::text FROM public.ticket_hour_estimates
UNION ALL SELECT 'PRE','ticket_efforts',              count(*)::text FROM public.ticket_efforts
UNION ALL SELECT 'PRE','ticket_consultant_efforts',   count(*)::text FROM public.ticket_consultant_efforts
UNION ALL SELECT 'PRE','ticket_history',              count(*)::text FROM public.ticket_history
UNION ALL SELECT 'PRE','ticket_unlock_requests',      count(*)::text FROM public.ticket_unlock_requests
UNION ALL SELECT 'PRE','ticket_delete_requests',      count(*)::text FROM public.ticket_delete_requests
UNION ALL SELECT 'PRE','satisfaction_ratings',        count(*)::text FROM public.satisfaction_ratings
UNION ALL SELECT 'PRE','notifications (ticket-related)', count(*)::text FROM public.notifications WHERE ticket_id IS NOT NULL
ORDER BY table_name;

-- ── PART B — DELETE (FK-safe, all-or-nothing) ────────────────────────────────
BEGIN;

  -- Grandchild first (FK → ticket_comments).
  DELETE FROM public.ticket_comment_attachments;

  -- Direct ticket children (every row is ticket-scoped).
  DELETE FROM public.ticket_actual_hours;
  DELETE FROM public.ticket_closure_requests;
  DELETE FROM public.ticket_reopen_requests;
  DELETE FROM public.ticket_comments;
  DELETE FROM public.ticket_attachments;
  DELETE FROM public.ticket_assignments;
  DELETE FROM public.ticket_estimates;
  DELETE FROM public.ticket_hour_estimates;
  DELETE FROM public.ticket_efforts;
  DELETE FROM public.ticket_consultant_efforts;
  DELETE FROM public.ticket_history;
  DELETE FROM public.ticket_unlock_requests;
  DELETE FROM public.ticket_delete_requests;
  DELETE FROM public.satisfaction_ratings;

  -- Ticket-related notifications ONLY (keep system/password/non-ticket notifications).
  DELETE FROM public.notifications WHERE ticket_id IS NOT NULL;

  -- Finally the tickets themselves.
  DELETE FROM public.tickets;

COMMIT;

-- ── PART C — RESTART THE TICKET-NUMBER SEQUENCE (next ticket → ...-000001) ────
-- RESTART WITH 1 sets is_called=false, so the next nextval() returns 1 → the next
-- inserted ticket gets <SHORTCODE>-<MODULE>-000001 (e.g. BAS-FICO-000001).
ALTER SEQUENCE public.ticket_sequence_seq RESTART WITH 1;

-- ── PART D — POST-VERIFY (READ-ONLY) ─────────────────────────────────────────
SELECT 'POST' AS phase, 'tickets (expect 0)' AS item, count(*)::text AS value FROM public.tickets
UNION ALL SELECT 'POST','ticket_history (expect 0)',          count(*)::text FROM public.ticket_history
UNION ALL SELECT 'POST','ticket_comments (expect 0)',         count(*)::text FROM public.ticket_comments
UNION ALL SELECT 'POST','ticket_assignments (expect 0)',      count(*)::text FROM public.ticket_assignments
UNION ALL SELECT 'POST','ticket_consultant_efforts (expect 0)', count(*)::text FROM public.ticket_consultant_efforts
UNION ALL SELECT 'POST','notifications w/ ticket_id (expect 0)', count(*)::text FROM public.notifications WHERE ticket_id IS NOT NULL
-- Sequence is back to yield 1 next: last_value=1 AND is_called=false → next nextval = 1.
UNION ALL SELECT 'POST','ticket_sequence_seq last_value (expect 1)', last_value::text FROM public.ticket_sequence_seq
UNION ALL SELECT 'POST','ticket_sequence_seq is_called (expect f → next = 1)', is_called::text FROM public.ticket_sequence_seq
-- Confirm clients / contracts / staff are intact (NOT wiped).
UNION ALL SELECT 'POST','organizations (KEPT, > 0)',          count(*)::text FROM public.organizations
UNION ALL SELECT 'POST','customer_contracts (KEPT)',          count(*)::text FROM public.customer_contracts
UNION ALL SELECT 'POST','client_sla_targets (KEPT)',          count(*)::text FROM public.client_sla_targets
UNION ALL SELECT 'POST','profiles: Consultant (KEPT)',        count(*)::text FROM public.profiles WHERE role = 'Consultant'
UNION ALL SELECT 'POST','profiles: Manager (KEPT)',           count(*)::text FROM public.profiles WHERE role = 'Manager'
UNION ALL SELECT 'POST','profiles: SuperAdmin (KEPT)',        count(*)::text FROM public.profiles WHERE role = 'SuperAdmin'
ORDER BY item;
