-- Fix Infinite Recursion in public.tickets RLS Policy
-- Drop the old policy that queried the tickets table, causing a circular reference
DROP POLICY IF EXISTS efforts_access_policy ON public.ticket_consultant_efforts;

-- Recreate the policy with a direct lookup on the consultant_id column, avoiding queries on public.tickets
CREATE POLICY efforts_access_policy ON public.ticket_consultant_efforts
    FOR ALL TO authenticated
    USING (
        (is_deleted = FALSE) AND (
            public.is_manager_or_admin() OR
            consultant_id = auth.uid()
        )
    );
