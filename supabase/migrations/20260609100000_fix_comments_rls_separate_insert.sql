-- RUN MANUALLY — Fix ticket_comments RLS for reliable INSERT by all roles
-- The existing FOR ALL policy conflates SELECT filtering (NOT is_internal for customers)
-- with INSERT checks, which can silently block or confuse writes.

-- Drop the existing combined policy
DROP POLICY IF EXISTS comments_access_policy ON public.ticket_comments;

-- SELECT policy: customers can only see non-internal comments on their org's tickets
CREATE POLICY comments_select_policy ON public.ticket_comments
    FOR SELECT TO authenticated
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

-- INSERT policy: any authenticated user who has access to the ticket can insert comments
CREATE POLICY comments_insert_policy ON public.ticket_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = (select auth.uid()) AND active = TRUE) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- UPDATE policy: same as SELECT (only ticket stakeholders)
CREATE POLICY comments_update_policy ON public.ticket_comments
    FOR UPDATE TO authenticated
    USING (
        public.is_manager_or_admin() OR
        author_id = (select auth.uid())
    );

-- DELETE policy: only admin/manager or author
CREATE POLICY comments_delete_policy ON public.ticket_comments
    FOR DELETE TO authenticated
    USING (
        public.is_manager_or_admin() OR
        author_id = (select auth.uid())
    );
