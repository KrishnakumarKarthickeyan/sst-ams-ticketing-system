-- SQL migration patch to fix RLS permissions on the ticket_history table.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR.

-- 1. Ensure RLS is active on the ticket_history table
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on ticket_history to prevent duplicates
DROP POLICY IF EXISTS ticket_history_select_policy ON public.ticket_history;
DROP POLICY IF EXISTS ticket_history_insert_policy ON public.ticket_history;

-- 3. Create SELECT policy: authenticated users can select logs for tickets they are allowed to see
CREATE POLICY ticket_history_select_policy ON public.ticket_history
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = false)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- 4. Create INSERT policy: authenticated users can insert log entries for tickets they are allowed to modify
CREATE POLICY ticket_history_insert_policy ON public.ticket_history
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = false)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Note: UPDATE and DELETE operations are intentionally blocked (no policy exists for them) to preserve history audit integrity.
