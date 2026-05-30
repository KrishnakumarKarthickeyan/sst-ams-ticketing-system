-- MIGRATION: RLS Assignments Alignment
-- This migration updates RLS policies on tickets, comments, attachments, and closure requests
-- to grant data visibility based on multi-consultant entries in the 'ticket_assignments' table.
--
-- TO APPLY THIS MIGRATION ON SUPABASE:
-- Run: npx supabase db push

-- 1. Align Tickets Access Policy
DROP POLICY IF EXISTS tickets_access_policy ON public.tickets;
CREATE POLICY tickets_access_policy ON public.tickets
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            assigned_consultant_id = (select auth.uid()) OR
            id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = (select auth.uid()) AND active = TRUE) OR
            id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid())))
    );

-- 2. Align Ticket Comments Access Policy
DROP POLICY IF EXISTS comments_access_policy ON public.ticket_comments;
CREATE POLICY comments_access_policy ON public.ticket_comments
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = (select auth.uid()) AND active = TRUE) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            NOT is_internal AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 3. Align Ticket Attachments Access Policy
DROP POLICY IF EXISTS attachments_access_policy ON public.ticket_attachments;
CREATE POLICY attachments_access_policy ON public.ticket_attachments
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = (select auth.uid()) AND active = TRUE) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 4. Align Ticket Closure Requests Access Policy
DROP POLICY IF EXISTS closure_requests_access_policy ON public.ticket_closure_requests;
CREATE POLICY closure_requests_access_policy ON public.ticket_closure_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = (select auth.uid()) AND active = TRUE) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 5. Align Ticket Unlock Requests Access Policy
DROP POLICY IF EXISTS unlock_requests_access_policy ON public.ticket_unlock_requests;
CREATE POLICY unlock_requests_access_policy ON public.ticket_unlock_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = (select auth.uid()) AND active = TRUE) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        ))
    );

-- 6. Align Actual Hours Write Policy to also support Primary Consultant via Assignments list
DROP POLICY IF EXISTS actual_hours_write_policy ON public.ticket_actual_hours;
CREATE POLICY actual_hours_write_policy ON public.ticket_actual_hours 
    FOR ALL TO authenticated 
    USING (
        public.is_manager_or_admin() OR 
        auth.uid() = (SELECT primary_consultant_id FROM public.tickets WHERE id = ticket_id) OR
        auth.uid() IN (SELECT consultant_id FROM public.ticket_assignments WHERE ticket_id = ticket_id AND is_primary = TRUE AND active = TRUE)
    )
    WITH CHECK (
        public.is_manager_or_admin() OR 
        auth.uid() = (SELECT primary_consultant_id FROM public.tickets WHERE id = ticket_id) OR
        auth.uid() IN (SELECT consultant_id FROM public.ticket_assignments WHERE ticket_id = ticket_id AND is_primary = TRUE AND active = TRUE)
    );
