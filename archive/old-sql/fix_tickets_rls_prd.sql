-- Production RLS Fix: Ensure Creator Access and Multi-Consultant Visibility
-- Run this in your Supabase SQL Editor to apply in live production

-- 1. Drop existing policy on tickets
DROP POLICY IF EXISTS tickets_access_policy ON public.tickets;

-- 2. Create updated all-access policy on tickets table
CREATE POLICY tickets_access_policy ON public.tickets
    FOR ALL TO authenticated
    USING (
        -- A. SuperAdmins and Managers can view and manage all tickets
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        
        -- B. The authenticated creator/requester of the ticket can always view and manage it
        auth.uid() = requested_by OR
        
        -- C. Assigned consultants (Primary lead, assigned specialists in assignments, or legacy efforts) can view it
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            assigned_consultant_id = auth.uid() OR
            primary_consultant_id = auth.uid() OR
            id IN (SELECT ticket_id FROM public.ticket_assignments WHERE consultant_id = auth.uid() AND active = true) OR
            id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid())
        )) OR
        
        -- D. Customers belonging to the ticket's organization can view the ticket
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

-- 3. Verify RLS is enabled
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
