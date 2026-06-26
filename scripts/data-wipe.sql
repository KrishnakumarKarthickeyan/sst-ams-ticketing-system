-- =============================================================================
--  RUN MANUALLY IN SUPABASE — IRREVERSIBLE
-- =============================================================================
--  Purpose : Wipe ALL tickets + ALL ticket data + ALL clients (customers,
--            client organizations, contracts, contacts, SLA targets), KEEP every
--            Consultant / Manager / SuperAdmin user, RESET the ticket-number
--            counter so the next ticket is <SHORTCODE>-000001, and force a
--            password reset for Manager + SuperAdmin.
--
--  HOW TO USE (verify-first):
--    1. Take a Supabase backup / confirm Point-in-Time Recovery is enabled FIRST
--       (Dashboard → Database → Backups). This script CANNOT be undone.
--    2. Run PART A alone and read the counts. Confirm what will be deleted/kept.
--    3. Only if the counts look right, run PART B (transaction), then C, D, E, F.
--    4. PART F re-verifies the end state (incl. the counter is back to yield 1).
--
--  Nothing in this file has been executed. It is for manual review + run in the
--  Supabase SQL editor (which runs as a privileged role, so it can touch
--  auth.users for PARTs D/E and ALTER the sequence for PART C).
--
--  ── SCHEMA VERIFIED AGAINST THE LIVE DB (read-only), values at authoring time ──
--    role enum values .......... Customer, Consultant, Manager, SuperAdmin
--    force-reset column ........ public.profiles.force_password_change (boolean)
--                                (the login MIDDLEWARE also reads auth.users
--                                 user_metadata.force_password_change — so PART E
--                                 sets BOTH; see PART E note.)
--    TICKET NUMBER MECHANISM ... (a) a single GLOBAL Postgres SEQUENCE:
--                                 public.ticket_sequence_seq (START WITH 1).
--                                The BEFORE INSERT trigger trg_generate_ticket_number
--                                (fn public.generate_ticket_number_trigger) ALWAYS
--                                sets ticket_number = <org customer_short_code> || '-'
--                                || LPAD(nextval('public.ticket_sequence_seq'),6,'0').
--                                There is NO per-org counter; the app cannot override
--                                it (the trigger overwrites on every insert).
--                                → Reset = ALTER SEQUENCE ... RESTART WITH 1 (PART C).
--    ticket child tables (exist) ticket_comment_attachments, ticket_attachments,
--      ticket_mentions, ticket_actual_hours, ticket_comments,
--      ticket_closure_requests, ticket_hour_estimates, ticket_estimates,
--      ticket_assignments, ticket_consultant_efforts, ticket_efforts,
--      ticket_escalations, ticket_modules, ticket_delete_requests,
--      ticket_reopen_requests, ticket_unlock_requests, ticket_history,
--      satisfaction_ratings
--    client tables (exist) ..... customer_contracts, client_sla_targets,
--      organization_contacts, organization_contact_tags, customer_contacts,
--      password_change_requests, notifications
--
--  ⚠️  SAFETY-CRITICAL FINDING — READ THIS:
--    All Consultants belong to ONE internal organization: "SST SAP Operations".
--    Customers belong to the OTHER (client) organizations. The profiles ↔
--    organizations foreign key may be ON DELETE CASCADE, so deleting that
--    internal org could CASCADE-DELETE the consultants.
--    → Therefore this script deletes ONLY the CLIENT organizations (orgs that are
--      NOT referenced by any kept staff profile) and PRESERVES the internal staff
--      org, so consultants/managers/admins are never touched. The next ticket
--      still starts at <SHORTCODE>-000001 because PART C resets the global sequence
--      and PART B empties the tickets table.
-- =============================================================================


-- =============================================================================
--  PART A — PRE-COUNT (READ-ONLY). Run this FIRST and review before anything.
--  Confirms what will be deleted and that no Consultant/Manager/Admin was
--  mis-stored as Customer (the KEEP counts must match expectations).
-- =============================================================================
SELECT 'tickets'                       AS item, count(*)::text AS value FROM public.tickets
UNION ALL SELECT 'ticket_comment_attachments', count(*)::text FROM public.ticket_comment_attachments
UNION ALL SELECT 'ticket_attachments',         count(*)::text FROM public.ticket_attachments
UNION ALL SELECT 'ticket_mentions',            count(*)::text FROM public.ticket_mentions
UNION ALL SELECT 'ticket_actual_hours',        count(*)::text FROM public.ticket_actual_hours
UNION ALL SELECT 'ticket_comments',            count(*)::text FROM public.ticket_comments
UNION ALL SELECT 'ticket_closure_requests',    count(*)::text FROM public.ticket_closure_requests
UNION ALL SELECT 'ticket_hour_estimates',      count(*)::text FROM public.ticket_hour_estimates
UNION ALL SELECT 'ticket_estimates',           count(*)::text FROM public.ticket_estimates
UNION ALL SELECT 'ticket_assignments',         count(*)::text FROM public.ticket_assignments
UNION ALL SELECT 'ticket_consultant_efforts',  count(*)::text FROM public.ticket_consultant_efforts
UNION ALL SELECT 'ticket_efforts',             count(*)::text FROM public.ticket_efforts
UNION ALL SELECT 'ticket_escalations',         count(*)::text FROM public.ticket_escalations
UNION ALL SELECT 'ticket_modules',             count(*)::text FROM public.ticket_modules
UNION ALL SELECT 'ticket_delete_requests',     count(*)::text FROM public.ticket_delete_requests
UNION ALL SELECT 'ticket_reopen_requests',     count(*)::text FROM public.ticket_reopen_requests
UNION ALL SELECT 'ticket_unlock_requests',     count(*)::text FROM public.ticket_unlock_requests
UNION ALL SELECT 'ticket_history',             count(*)::text FROM public.ticket_history
UNION ALL SELECT 'satisfaction_ratings',       count(*)::text FROM public.satisfaction_ratings
UNION ALL SELECT 'notifications (ALL — cleared)', count(*)::text FROM public.notifications
UNION ALL SELECT 'customer_contracts',         count(*)::text FROM public.customer_contracts
UNION ALL SELECT 'organization_contacts',      count(*)::text FROM public.organization_contacts
UNION ALL SELECT 'organization_contact_tags',  count(*)::text FROM public.organization_contact_tags
UNION ALL SELECT 'customer_contacts',          count(*)::text FROM public.customer_contacts
UNION ALL SELECT 'organizations — TOTAL',      count(*)::text FROM public.organizations
UNION ALL SELECT 'organizations — CLIENT (DELETE)', count(*)::text
  FROM public.organizations
  WHERE id NOT IN (SELECT organization_id FROM public.profiles WHERE role <> 'Customer' AND organization_id IS NOT NULL)
UNION ALL SELECT 'organizations — STAFF (KEEP)', count(*)::text
  FROM public.organizations
  WHERE id IN (SELECT organization_id FROM public.profiles WHERE role <> 'Customer' AND organization_id IS NOT NULL)
UNION ALL SELECT 'profiles: Customer   (DELETE)', count(*)::text FROM public.profiles WHERE role = 'Customer'
UNION ALL SELECT 'profiles: Consultant (KEEP)',   count(*)::text FROM public.profiles WHERE role = 'Consultant'
UNION ALL SELECT 'profiles: Manager    (KEEP)',   count(*)::text FROM public.profiles WHERE role = 'Manager'
UNION ALL SELECT 'profiles: SuperAdmin (KEEP)',   count(*)::text FROM public.profiles WHERE role = 'SuperAdmin'
UNION ALL SELECT 'ticket_sequence_seq last_value (current)', last_value::text FROM public.ticket_sequence_seq
ORDER BY item;


-- =============================================================================
--  PART B — DELETION (TRANSACTION). FK-safe order: ticket grandchildren →
--  ticket children → tickets → notifications → client-org children → customers →
--  client organizations. All-or-nothing: if any statement fails, ROLLBACK.
-- =============================================================================
BEGIN;

-- The CLIENT organizations = orgs NOT referenced by any kept (non-Customer)
-- profile. Computed once up-front (independent of deletion order) so the internal
-- staff org "SST SAP Operations" is always excluded → consultants safe.
CREATE TEMP TABLE _client_orgs ON COMMIT DROP AS
  SELECT id FROM public.organizations
  WHERE id NOT IN (
    SELECT organization_id FROM public.profiles
    WHERE role <> 'Customer' AND organization_id IS NOT NULL
  );

-- ── Ticket grandchildren first (rows that reference other ticket children) ──
DELETE FROM public.ticket_comment_attachments;   -- attachments on comments
DELETE FROM public.ticket_attachments;           -- ticket-level attachments
DELETE FROM public.ticket_mentions;              -- @mentions inside comments
DELETE FROM public.ticket_actual_hours;          -- logged hours under closure requests

-- ── Ticket children (all reference tickets) ──
DELETE FROM public.ticket_comments;              -- comment thread
DELETE FROM public.ticket_closure_requests;      -- closure requests
DELETE FROM public.ticket_hour_estimates;        -- hour estimates
DELETE FROM public.ticket_estimates;             -- per-consultant estimates
DELETE FROM public.ticket_assignments;           -- consultant assignments
DELETE FROM public.ticket_consultant_efforts;    -- synthesized/consultant efforts
DELETE FROM public.ticket_efforts;               -- legacy timesheet efforts
DELETE FROM public.ticket_escalations;           -- escalation records
DELETE FROM public.ticket_modules;               -- SAP module links
DELETE FROM public.ticket_delete_requests;       -- delete requests
DELETE FROM public.ticket_reopen_requests;       -- reopen requests
DELETE FROM public.ticket_unlock_requests;       -- unlock requests
DELETE FROM public.ticket_history;               -- audit/history trail
DELETE FROM public.satisfaction_ratings;         -- CSAT ratings

-- ── The tickets themselves ──
DELETE FROM public.tickets;                       -- ALL tickets (mock AND real)

-- ── Notifications (transient; reference tickets/users) — clear all ──
DELETE FROM public.notifications;                 -- full clean slate

-- ── Client (customer organization) data ──
-- organization_contacts has NO organization_id column — contacts are client
-- contact-persons linked to orgs by NAME via organization_contact_tags. These
-- two tables are entirely client-contact data, so clear them wholesale.
DELETE FROM public.organization_contact_tags;               -- client contact↔org tags (FK→contacts)
DELETE FROM public.organization_contacts;                   -- client contact persons
DELETE FROM public.customer_contacts
  WHERE organization_id IN (SELECT id FROM _client_orgs);   -- legacy customer contacts (has org id)
DELETE FROM public.customer_contracts
  WHERE organization_id IN (SELECT id FROM _client_orgs);    -- client contracts
DELETE FROM public.client_sla_targets
  WHERE organization_id IN (SELECT id FROM _client_orgs);    -- client per-priority SLA targets

-- ── Customer-owned password change requests (before deleting their profiles) ──
DELETE FROM public.password_change_requests
  WHERE user_id IN (SELECT id FROM public.profiles WHERE role = 'Customer');

-- ── Customer profiles (KEEPS Consultant/Manager/SuperAdmin untouched) ──
DELETE FROM public.profiles WHERE role = 'Customer';

-- ── Client organizations (staff org excluded by _client_orgs → consultants safe) ──
DELETE FROM public.organizations WHERE id IN (SELECT id FROM _client_orgs);

COMMIT;


-- =============================================================================
--  PART C — RESET THE TICKET-NUMBER COUNTER (so the next ticket = 000001).
--  Mechanism = (a) a single GLOBAL sequence public.ticket_sequence_seq consumed
--  by the BEFORE INSERT trigger. Tickets are now empty (PART B), so restarting
--  the sequence makes the trigger's next nextval() return 1 →
--  <new org customer_short_code>-000001 for the first ticket created after the wipe.
--  RESTART WITH 1 sets is_called=false, so the VERY NEXT nextval() returns 1.
-- =============================================================================
ALTER SEQUENCE public.ticket_sequence_seq RESTART WITH 1;
--  (Equivalent alternative, if you prefer: SELECT setval('public.ticket_sequence_seq', 1, false); )


-- =============================================================================
--  PART D — ORPHANED AUTH CLEANUP (READ + DELETE on auth.users).
--  Removes the deleted customers' login accounts; keeps every account that still
--  has a public.profiles row (all consultants/managers/admins). Run AFTER PART B.
-- =============================================================================
DELETE FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.profiles);


-- =============================================================================
--  PART E — FORCE PASSWORD RESET for Manager + SuperAdmin.
--  This app gates the forced reset in TWO places:
--    • public.profiles.force_password_change  (read by AuthContext)
--    • auth.users user_metadata.force_password_change (read by middleware.ts —
--      this is what actually redirects the user to the reset screen)
--  So we set BOTH. The SQL editor runs privileged, so no Admin API is needed.
-- =============================================================================
UPDATE public.profiles
  SET force_password_change = true
  WHERE role IN ('Manager', 'SuperAdmin');

UPDATE auth.users
  SET raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"force_password_change": true}'::jsonb
  WHERE id IN (
    SELECT id FROM public.profiles WHERE role IN ('Manager', 'SuperAdmin'));


-- =============================================================================
--  PART F — POST-VERIFY (READ-ONLY). Expect: tickets=0, all ticket children=0,
--  client orgs/contracts/sla=0, ONLY Consultant/Manager/SuperAdmin remain, the
--  staff org is still present, and the sequence is back to yield 1 next.
--  NOTE: this only READS the sequence (last_value/is_called) — it does NOT call
--  nextval(), so it does not consume the 000001 value.
-- =============================================================================
SELECT 'tickets (expect 0)'              AS item, count(*)::text AS value FROM public.tickets
UNION ALL SELECT 'ticket_comments (expect 0)',        count(*)::text FROM public.ticket_comments
UNION ALL SELECT 'ticket_history (expect 0)',         count(*)::text FROM public.ticket_history
UNION ALL SELECT 'ticket_assignments (expect 0)',     count(*)::text FROM public.ticket_assignments
UNION ALL SELECT 'satisfaction_ratings (expect 0)',   count(*)::text FROM public.satisfaction_ratings
UNION ALL SELECT 'notifications (expect 0)',          count(*)::text FROM public.notifications
UNION ALL SELECT 'customer_contracts (expect 0)',     count(*)::text FROM public.customer_contracts
UNION ALL SELECT 'organization_contacts (expect 0)',  count(*)::text FROM public.organization_contacts
UNION ALL SELECT 'organizations (expect 1 = staff org)', count(*)::text FROM public.organizations
UNION ALL SELECT 'profiles: Customer (expect 0)',     count(*)::text FROM public.profiles WHERE role = 'Customer'
UNION ALL SELECT 'profiles: Consultant (KEEP)',       count(*)::text FROM public.profiles WHERE role = 'Consultant'
UNION ALL SELECT 'profiles: Manager (KEEP, reset)',   count(*)::text FROM public.profiles WHERE role = 'Manager'
UNION ALL SELECT 'profiles: SuperAdmin (KEEP, reset)',count(*)::text FROM public.profiles WHERE role = 'SuperAdmin'
UNION ALL SELECT 'Manager+Admin force_password_change=true',
  count(*)::text FROM public.profiles WHERE role IN ('Manager','SuperAdmin') AND force_password_change = true
UNION ALL SELECT 'ticket_sequence_seq last_value (expect 1)', last_value::text FROM public.ticket_sequence_seq
UNION ALL SELECT 'ticket_sequence_seq is_called (expect f → next nextval = 1)', is_called::text FROM public.ticket_sequence_seq
ORDER BY item;
