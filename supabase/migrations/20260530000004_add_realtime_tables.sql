-- MIGRATION: Add Realtime tables
-- This migration updates the 'supabase_realtime' publication to broadcast changes
-- for profiles, organizations, customer contracts, customer contacts, ticket assignments,
-- estimates, and actual hours tables.
--
-- TO APPLY THIS MIGRATION ON SUPABASE:
-- Run: npx supabase db push

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            -- Alter the publication to include all profile, contact, contract, and assignment tables
            ALTER PUBLICATION supabase_realtime ADD TABLE 
                public.profiles,
                public.organizations,
                public.customer_contracts,
                public.customer_contacts,
                public.ticket_assignments,
                public.ticket_estimates,
                public.ticket_actual_hours;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback: Ignore errors if some of the tables are already added
            NULL;
        END;
    END IF;
END $$;
