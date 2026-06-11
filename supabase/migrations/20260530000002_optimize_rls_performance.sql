-- MIGRATION: RLS Performance Optimization
-- This migration updates all Row Level Security (RLS) policies to wrap 'auth.uid()' calls in a select subquery: '(select auth.uid())'.
-- This forces the Postgres query planner to evaluate the function once instead of re-evaluating it for every row scan.
--
-- TO APPLY THIS MIGRATION ON SUPABASE:
-- Run: npx supabase db push

-- 1. Re-create Security Helper Functions with Optimized UID subqueries
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN (
        coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('SuperAdmin', 'Manager') OR
        coalesce(auth.jwt() ->> 'email', '') = 'manager@supportstudio.com' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (select auth.uid()) 
            AND role IN ('SuperAdmin', 'Manager')
        )
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_consultant_on_ticket(t_id VARCHAR(50), u_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tickets
        WHERE id = t_id AND (
            assigned_consultant_id = u_id OR
            primary_consultant_id = u_id
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles Policies
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;

CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_policy ON public.profiles FOR INSERT WITH CHECK (public.is_manager_or_admin());
CREATE POLICY profiles_update_policy ON public.profiles FOR UPDATE USING (public.is_manager_or_admin() OR id = (select auth.uid()));
CREATE POLICY profiles_delete_policy ON public.profiles FOR DELETE USING (public.is_manager_or_admin());

-- 3. Organizations Policies
DROP POLICY IF EXISTS org_read_policy ON public.organizations;
DROP POLICY IF EXISTS org_insert_policy ON public.organizations;
DROP POLICY IF EXISTS org_update_policy ON public.organizations;
DROP POLICY IF EXISTS org_delete_policy ON public.organizations;

CREATE POLICY org_read_policy ON public.organizations FOR SELECT TO authenticated USING (public.is_manager_or_admin() OR id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid())));
CREATE POLICY org_insert_policy ON public.organizations FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin());
CREATE POLICY org_update_policy ON public.organizations FOR UPDATE TO authenticated USING (public.is_manager_or_admin());
CREATE POLICY org_delete_policy ON public.organizations FOR DELETE TO authenticated USING (public.is_manager_or_admin());

-- 4. Customer Contracts Policies
DROP POLICY IF EXISTS contracts_select_policy ON public.customer_contracts;
DROP POLICY IF EXISTS contracts_insert_policy ON public.customer_contracts;
DROP POLICY IF EXISTS contracts_update_policy ON public.customer_contracts;
DROP POLICY IF EXISTS contracts_delete_policy ON public.customer_contracts;

CREATE POLICY contracts_select_policy ON public.customer_contracts FOR SELECT TO authenticated USING (public.is_manager_or_admin() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid())));
CREATE POLICY contracts_insert_policy ON public.customer_contracts FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin());
CREATE POLICY contracts_update_policy ON public.customer_contracts FOR UPDATE TO authenticated USING (public.is_manager_or_admin());
CREATE POLICY contracts_delete_policy ON public.customer_contracts FOR DELETE TO authenticated USING (public.is_manager_or_admin());

-- 5. Customer Contacts Policies
DROP POLICY IF EXISTS contacts_access_policy ON public.customer_contacts;
CREATE POLICY contacts_access_policy ON public.customer_contacts FOR ALL TO authenticated USING (public.is_manager_or_admin() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid())));

-- 6. Tickets Access RLS Policies
DROP POLICY IF EXISTS tickets_access_policy ON public.tickets;
CREATE POLICY tickets_access_policy ON public.tickets
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            assigned_consultant_id = (select auth.uid()) OR
            id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid())))
    );

-- 7. Ticket Comments Policies
DROP POLICY IF EXISTS comments_access_policy ON public.ticket_comments;
CREATE POLICY comments_access_policy ON public.ticket_comments
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            NOT is_internal AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 8. Ticket Attachments Policies
DROP POLICY IF EXISTS attachments_access_policy ON public.ticket_attachments;
CREATE POLICY attachments_access_policy ON public.ticket_attachments
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 9. Ticket Escalations Policies
DROP POLICY IF EXISTS escalations_access_policy ON public.ticket_escalations;
CREATE POLICY text_escalations_access_policy ON public.ticket_escalations
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 10. Ticket Modules Policies
DROP POLICY IF EXISTS modules_access_policy ON public.ticket_modules;
CREATE POLICY modules_access_policy ON public.ticket_modules
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 11. Delete Requests Policies
DROP POLICY IF EXISTS delete_requests_access_policy ON public.ticket_delete_requests;
CREATE POLICY delete_requests_access_policy ON public.ticket_delete_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 12. Hour Estimates Policies
DROP POLICY IF EXISTS hour_estimates_access_policy ON public.ticket_hour_estimates;
CREATE POLICY hour_estimates_access_policy ON public.ticket_hour_estimates
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        ))
    );

-- 13. Closure Requests Policies
DROP POLICY IF EXISTS closure_requests_access_policy ON public.ticket_closure_requests;
CREATE POLICY closure_requests_access_policy ON public.ticket_closure_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))))
    );

-- 14. Consultant Efforts (Select, Update, Delete, Insert) Policies
DROP POLICY IF EXISTS efforts_select_policy ON public.ticket_consultant_efforts;
DROP POLICY IF EXISTS efforts_update_policy ON public.ticket_consultant_efforts;
DROP POLICY IF EXISTS efforts_delete_policy ON public.ticket_consultant_efforts;
DROP POLICY IF EXISTS efforts_insert_policy ON public.ticket_consultant_efforts;

CREATE POLICY efforts_select_policy ON public.ticket_consultant_efforts
    FOR SELECT TO authenticated
    USING (
        (is_deleted = FALSE) AND (
            public.is_manager_or_admin() OR
            consultant_id = (select auth.uid()) OR
            public.is_consultant_on_ticket(ticket_id, (select auth.uid()))
        )
    );

CREATE POLICY efforts_update_policy ON public.ticket_consultant_efforts
    FOR UPDATE TO authenticated
    USING (
        (is_deleted = FALSE) AND (
            public.is_manager_or_admin() OR
            consultant_id = (select auth.uid()) OR
            public.is_consultant_on_ticket(ticket_id, (select auth.uid()))
        )
    );

CREATE POLICY efforts_delete_policy ON public.ticket_consultant_efforts
    FOR DELETE TO authenticated
    USING (
        (is_deleted = FALSE) AND (
            public.is_manager_or_admin() OR
            consultant_id = (select auth.uid()) OR
            public.is_consultant_on_ticket(ticket_id, (select auth.uid()))
        )
    );

CREATE POLICY efforts_insert_policy ON public.ticket_consultant_efforts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_manager_or_admin() OR
        consultant_id = (select auth.uid()) OR
        public.is_consultant_on_ticket(ticket_id, (select auth.uid()))
    );

-- 15. Unlock Requests Policies
DROP POLICY IF EXISTS unlock_requests_access_policy ON public.ticket_unlock_requests;
CREATE POLICY unlock_requests_access_policy ON public.ticket_unlock_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = (select auth.uid())) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = (select auth.uid()) AND is_deleted = FALSE)
        ))
    );

-- 16. Ticket Efforts (Timesheet table) Policies
DROP POLICY IF EXISTS ticket_efforts_access_policy ON public.ticket_efforts;
CREATE POLICY ticket_efforts_access_policy ON public.ticket_efforts
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        consultant_id = (select auth.uid())
    );

-- 17. CSAT Ratings Policies
DROP POLICY IF EXISTS csat_select_policy ON public.satisfaction_ratings;
DROP POLICY IF EXISTS csat_insert_policy ON public.satisfaction_ratings;

CREATE POLICY csat_select_policy ON public.satisfaction_ratings FOR SELECT TO authenticated USING (public.is_manager_or_admin() OR ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))));
CREATE POLICY csat_insert_policy ON public.satisfaction_ratings FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin() OR ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = (select auth.uid()))));

-- 18. Knowledgebase Articles Policies
DROP POLICY IF EXISTS kb_select_policy ON public.knowledgebase_articles;
CREATE POLICY kb_select_policy ON public.knowledgebase_articles FOR SELECT TO authenticated USING ((NOT is_internal) OR ((SELECT role FROM public.profiles WHERE id = (select auth.uid())) IN ('SuperAdmin', 'Manager', 'Consultant')));

-- 19. Notifications Policies
DROP POLICY IF EXISTS notifications_access_policy ON public.notifications;
CREATE POLICY notifications_access_policy ON public.notifications FOR ALL TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
