-- =============================================================================
--  RUN MANUALLY IN SUPABASE — IRREVERSIBLE
-- =============================================================================
--  Purpose : Wipe ALL tickets + ALL ticket data + ALL clients (customers,
--            client organizations, contracts, contacts, SLA targets), while
--            KEEPING every Consultant / Manager / SuperAdmin user. Then force a
--            password reset for Manager + SuperAdmin.
--
--  HOW TO USE (verify-first):
--    1. Take a Supabase backup / confirm Point-in-Time Recovery is enabled FIRST
--       (Dashboard → Database → Backups). This script CANNOT be undone.
--    2. Run PART A alone and read the counts. Confirm what will be deleted/kept.
--    3. Only if the counts look right, run PART B (transaction), then C, D, E.
--    4. PART E re-verifies the end state.
--
--  Nothing in this file has been executed. It is for manual review + run in the
--  Supabase SQL editor (which runs as a privileged role, so it can touch
--  auth.users for PARTs C/D).
--
--  ── SCHEMA VERIFIED AGAINST THE LIVE DB (read-only), values at authoring time ──
--    role enum values .......... Customer, Consultant, Manager, SuperAdmin
--    force-reset column ........ public.profiles.force_password_change (boolean)
--                                (the login MIDDLEWARE also reads
--                                 auth.users user_metadata.force_password_change —
--                                 so PART D sets BOTH; see PART D note.)
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
--      NOT referenced by any kept staff profile). The internal staff org is
--      preserved so consultants/managers/admins are never touched. This is a
--      deliberate, safer interpretation of "delete all organizations" — the
--      internal org is staff infrastructure, not a client.
-- =============================================================================


-- =============================================================================
--  PART A — PRE-COUNT (READ-ONLY). Run this FIRST and review before anything.
--  Use it to confirm what will be deleted and that no Consultant/Manager/Admin
--  was mis-stored as Customer (the KEEP counts below must match expectations).
-- =============================================================================
SELECT 'tickets'                       AS item, count(*) AS rows FROM public.tickets
UNION ALL SELECT 'ticket_comment_attachments', count(*) FROM public.ticket_comment_attachments
UNION ALL SELECT 'ticket_attachments',         count(*) FROM public.ticket_attachments
UNION ALL SELECT 'ticket_mentions',            count(*) FROM public.ticket_mentions
UNION ALL SELECT 'ticket_actual_hours',        count(*) FROM public.ticket_actual_hours
UNION ALL SELECT 'ticket_comments',            count(*) FROM public.ticket_comments
UNION ALL SELECT 'ticket_closure_requests',    count(*) FROM public.ticket_closure_requests
UNION ALL SELECT 'ticket_hour_estimates',      count(*) FROM public.ticket_hour_estimates
UNION ALL SELECT 'ticket_estimates',           count(*) FROM public.ticket_estimates
UNION ALL SELECT 'ticket_assignments',         count(*) FROM public.ticket_assignments
UNION ALL SELECT 'ticket_consultant_efforts',  count(*) FROM public.ticket_consultant_efforts
UNION ALL SELECT 'ticket_efforts',             count(*) FROM public.ticket_efforts
UNION ALL SELECT 'ticket_escalations',         count(*) FROM public.ticket_escalations
UNION ALL SELECT 'ticket_modules',             count(*) FROM public.ticket_modules
UNION ALL SELECT 'ticket_delete_requests',     count(*) FROM public.ticket_delete_requests
UNION ALL SELECT 'ticket_reopen_requests',     count(*) FROM public.ticket_reopen_requests
UNION ALL SELECT 'ticket_unlock_requests',     count(*) FROM public.ticket_unlock_requests
UNION ALL SELECT 'ticket_history',             count(*) FROM public.ticket_history
UNION ALL SELECT 'satisfaction_ratings',       count(*) FROM public.satisfaction_ratings
UNION ALL SELECT 'notifications (ALL — cleared)', count(*) FROM public.notifications
UNION ALL SELECT 'customer_contracts',         count(*) FROM public.customer_contracts
UNION ALL SELECT 'organization_contacts',      count(*) FROM public.organization_contacts
UNION ALL SELECT 'organization_contact_tags',  count(*) FROM public.organization_contact_tags
UNION ALL SELECT 'customer_contacts',          count(*) FROM public.customer_contacts
UNION ALL SELECT 'password_change_requests (customer-owned)', count(*)
  FROM public.password_change_requests
  WHERE user_id IN (SELECT id FROM public.profiles WHERE role = 'Customer')
UNION ALL SELECT 'client_sla_targets (CLIENT orgs)', count(*)
  FROM public.client_sla_targets
  WHERE organization_id NOT IN (
    SELECT organization_id FROM public.profiles WHERE role <> 'Customer' AND organization_id IS NOT NULL)
UNION ALL SELECT 'organizations — TOTAL',      count(*) FROM public.organizations
UNION ALL SELECT 'organizations — CLIENT (DELETE)', count(*)
  FROM public.organizations
  WHERE id NOT IN (
    SELECT organization_id FROM public.profiles WHERE role <> 'Customer' AND organization_id IS NOT NULL)
UNION ALL SELECT 'organizations — STAFF (KEEP)', count(*)
  FROM public.organizations
  WHERE id IN (
    SELECT organization_id FROM public.profiles WHERE role <> 'Customer' AND organization_id IS NOT NULL)
UNION ALL SELECT 'profiles: Customer   (DELETE)', count(*) FROM public.profiles WHERE role = 'Customer'
UNION ALL SELECT 'profiles: Consultant (KEEP)',   count(*) FROM public.profiles WHERE role = 'Consultant'
UNION ALL SELECT 'profiles: Manager    (KEEP)',   count(*) FROM public.profiles WHERE role = 'Manager'
UNION ALL SELECT 'profiles: SuperAdmin (KEEP)',   count(*) FROM public.profiles WHERE role = 'SuperAdmin'
ORDER BY item;


-- =============================================================================
--  PART B — DELETION (TRANSACTION). FK-safe order: ticket grandchildren →
--  ticket children → tickets → notifications → client-org children → customers →
--  client organizations. All-or-nothing: if any statement fails, ROLLBACK.
-- =============================================================================
BEGIN;

-- The CLIENT organizations = orgs NOT referenced by any kept (non-Customer)
-- profile. Computed once up-front (independent of deletion order) so the
-- internal staff org "SST SAP Operations" is always excluded → consultants safe.
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

-- ── Client (customer organization) data, scoped to CLIENT orgs only ──
DELETE FROM public.organization_contact_tags
  WHERE contact_id IN (
    SELECT id FROM public.organization_contacts
    WHERE organization_id IN (SELECT id FROM _client_orgs)); -- tags on client contacts
DELETE FROM public.organization_contacts
  WHERE organization_id IN (SELECT id FROM _client_orgs);    -- client org contacts
DELETE FROM public.customer_contacts
  WHERE organization_id IN (SELECT id FROM _client_orgs);    -- legacy customer contacts
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
--  PART C — ORPHANED AUTH CLEANUP (READ + DELETE on auth.users).
--  Removes the deleted customers' login accounts; keeps every account that
--  still has a public.profiles row (i.e. all consultants/managers/admins).
--  Run AFTER PART B has committed.
-- =============================================================================
DELETE FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.profiles);


-- =============================================================================
--  PART D — FORCE PASSWORD RESET for Manager + SuperAdmin.
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
--  PART E — POST-VERIFY (READ-ONLY). Expect: tickets=0, all ticket children=0,
--  client orgs/contracts/sla=0, ONLY Consultant/Manager/SuperAdmin remain,
--  and the staff org is still present.
-- =============================================================================
SELECT 'tickets (expect 0)'              AS item, count(*) AS rows FROM public.tickets
UNION ALL SELECT 'ticket_comments (expect 0)',        count(*) FROM public.ticket_comments
UNION ALL SELECT 'ticket_history (expect 0)',         count(*) FROM public.ticket_history
UNION ALL SELECT 'ticket_assignments (expect 0)',     count(*) FROM public.ticket_assignments
UNION ALL SELECT 'satisfaction_ratings (expect 0)',   count(*) FROM public.satisfaction_ratings
UNION ALL SELECT 'notifications (expect 0)',          count(*) FROM public.notifications
UNION ALL SELECT 'customer_contracts (expect 0)',     count(*) FROM public.customer_contracts
UNION ALL SELECT 'organization_contacts (expect 0)',  count(*) FROM public.organization_contacts
UNION ALL SELECT 'organizations (expect 1 = staff org)', count(*) FROM public.organizations
UNION ALL SELECT 'profiles: Customer (expect 0)',     count(*) FROM public.profiles WHERE role = 'Customer'
UNION ALL SELECT 'profiles: Consultant (KEEP)',       count(*) FROM public.profiles WHERE role = 'Consultant'
UNION ALL SELECT 'profiles: Manager (KEEP, reset)',   count(*) FROM public.profiles WHERE role = 'Manager'
UNION ALL SELECT 'profiles: SuperAdmin (KEEP, reset)',count(*) FROM public.profiles WHERE role = 'SuperAdmin'
UNION ALL SELECT 'Manager+Admin with force_password_change=true',
  count(*) FROM public.profiles WHERE role IN ('Manager','SuperAdmin') AND force_password_change = true
ORDER BY item;
