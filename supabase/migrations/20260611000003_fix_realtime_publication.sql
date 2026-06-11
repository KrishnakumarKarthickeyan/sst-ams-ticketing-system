-- MIGRATION: Repair realtime publication coverage (2026-06-11 enterprise audit P0)
--
-- Previous migrations added tables to supabase_realtime in single multi-table
-- ALTER statements wrapped in `EXCEPTION WHEN OTHERS THEN NULL`. If ANY table in
-- a batch was already a publication member, the WHOLE batch silently failed, so
-- actual coverage may be incomplete. ticket_history and ticket_reopen_requests
-- were never in any batch, although the client subscribes to both.
--
-- This migration adds every table the client listens to ONE PER STATEMENT, so a
-- duplicate never blocks the rest. Tables that don't exist are skipped.

DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'tickets',
    'ticket_comments',
    'ticket_comment_attachments',
    'ticket_attachments',
    'ticket_actual_hours',
    'ticket_closure_requests',
    'ticket_assignments',
    'ticket_estimates',
    'ticket_hour_estimates',
    'ticket_efforts',
    'ticket_history',
    'ticket_unlock_requests',
    'ticket_reopen_requests',
    'ticket_consultant_efforts',
    'ticket_delete_requests',
    'ticket_modules',
    'satisfaction_ratings',
    'notifications',
    'profiles',
    'organizations',
    'customer_contracts',
    'customer_contacts'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION WHEN duplicate_object THEN
        NULL; -- already a member: fine, move on to the next table
      END;
    END IF;
  END LOOP;
END $$;
