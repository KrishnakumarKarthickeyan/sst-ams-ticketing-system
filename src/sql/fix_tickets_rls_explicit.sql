-- SQL Migration to separate RLS policies on tickets table into distinct actions
-- Run this in the Supabase SQL editor.

-- 1. Ensure RLS is enabled
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 2. Drop the old unified policy
DROP POLICY IF EXISTS tickets_access_policy ON public.tickets;

-- 3. Create SELECT policy: View access for managers, owners, customers of same org, or assigned consultants
DROP POLICY IF EXISTS tickets_select_policy ON public.tickets;
CREATE POLICY tickets_select_policy ON public.tickets
    FOR SELECT TO authenticated
    USING (
        -- A. Managers and SuperAdmins can read all records
        public.is_manager_or_admin() OR
        
        -- B. The user who is assigned as the requester of the ticket
        auth.uid() = requested_by OR
        auth.uid() = created_by_user OR
        
        -- C. Customers belonging to the same organization as the ticket
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) OR
            
        -- D. Consultants assigned to the ticket (directly, in secondary assignments, or with efforts logged)
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            assigned_consultant_id = auth.uid() OR
            id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = TRUE) OR
            id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        ))
    );

-- 4. Create INSERT policy: Managers can insert on behalf, and customers can insert for their own organization
DROP POLICY IF EXISTS tickets_insert_policy ON public.tickets;
CREATE POLICY tickets_insert_policy ON public.tickets
    FOR INSERT TO authenticated
    WITH CHECK (
        -- A. Managers and SuperAdmins can create any ticket
        public.is_manager_or_admin() OR
        
        -- B. Customers can create tickets for their own organization
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
            requested_by = auth.uid())
    );

-- 5. Create UPDATE policy: Managers can update everything; Consultants and Customers can update allowed fields within their scope
DROP POLICY IF EXISTS tickets_update_policy ON public.tickets;
CREATE POLICY tickets_update_policy ON public.tickets
    FOR UPDATE TO authenticated
    USING (
        -- A. Managers and SuperAdmins can update any ticket
        public.is_manager_or_admin() OR
        
        -- B. Assigned consultants can update their tickets
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            assigned_consultant_id = auth.uid() OR
            id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        )) OR
        
        -- C. Customers can update within their organization scope
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        -- Enforce similar organization scope checks on update payload changes
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant') OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );
