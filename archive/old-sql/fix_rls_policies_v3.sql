-- SQL Migration to support secondary consultant assignments in RLS Policies

-- 1. Redefine is_consultant_on_ticket helper function to check assignments table
CREATE OR REPLACE FUNCTION public.is_consultant_on_ticket(t_id VARCHAR(50), u_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tickets
        WHERE id = t_id AND (
            assigned_consultant_id = u_id OR
            primary_consultant_id = u_id
        )
    ) OR EXISTS (
        SELECT 1 FROM public.ticket_assignments
        WHERE ticket_id = t_id AND consultant_id = u_id AND active = true
    ) OR EXISTS (
        SELECT 1 FROM public.ticket_consultant_efforts
        WHERE ticket_id = t_id AND consultant_id = u_id AND is_deleted = false
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Update tickets table RLS policy
DROP POLICY IF EXISTS tickets_access_policy ON public.tickets;
CREATE POLICY tickets_access_policy ON public.tickets
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            assigned_consultant_id = auth.uid() OR
            id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = false)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

-- 3. Update ticket_comments table RLS policy
DROP POLICY IF EXISTS comments_access_policy ON public.ticket_comments;
CREATE POLICY comments_access_policy ON public.ticket_comments
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = false)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            NOT is_internal AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- 4. Update ticket_attachments table RLS policy
DROP POLICY IF EXISTS attachments_access_policy ON public.ticket_attachments;
CREATE POLICY attachments_access_policy ON public.ticket_attachments
    FOR ALL TO authenticated
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

-- 5. Update ticket_comment_attachments table RLS policy
DROP POLICY IF EXISTS comment_attachments_access_policy ON public.ticket_comment_attachments;
CREATE POLICY comment_attachments_access_policy ON public.ticket_comment_attachments
    FOR ALL TO authenticated
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

-- 6. Update ticket_consultant_efforts table RLS policy
DROP POLICY IF EXISTS efforts_access_policy ON public.ticket_consultant_efforts;
CREATE POLICY efforts_access_policy ON public.ticket_consultant_efforts
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = false)
        ))
    );

-- 7. Update hour estimates RLS policy
DROP POLICY IF EXISTS hour_estimates_access_policy ON public.ticket_hour_estimates;
CREATE POLICY hour_estimates_access_policy ON public.ticket_hour_estimates
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = false)
        ))
    );

-- 8. Update ticket closure requests RLS policy
DROP POLICY IF EXISTS closure_requests_access_policy ON public.ticket_closure_requests;
CREATE POLICY closure_requests_access_policy ON public.ticket_closure_requests
    FOR ALL TO authenticated
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

-- 9. Update ticket unlock requests RLS policy
DROP POLICY IF EXISTS unlock_requests_access_policy ON public.ticket_unlock_requests;
CREATE POLICY unlock_requests_access_policy ON public.ticket_unlock_requests
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = false)
        ))
    );

-- 10. Update estimates write policy for managers & self
DROP POLICY IF EXISTS estimates_write_policy ON public.ticket_estimates;
CREATE POLICY estimates_write_policy ON public.ticket_estimates 
    FOR ALL TO authenticated 
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND consultant_id = auth.uid())
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND consultant_id = auth.uid())
    );
