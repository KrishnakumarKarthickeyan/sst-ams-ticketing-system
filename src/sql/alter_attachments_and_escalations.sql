-- Database Migration Patch
-- Alters ticket_attachments to support linking files to comments, closures, and escalations

-- 1. Add comment_id foreign key if not exists
ALTER TABLE public.ticket_attachments 
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES public.ticket_comments(id) ON DELETE CASCADE;

-- 2. Add closure_request_id foreign key if not exists
ALTER TABLE public.ticket_attachments 
ADD COLUMN IF NOT EXISTS closure_request_id UUID REFERENCES public.ticket_closure_requests(id) ON DELETE CASCADE;

-- 3. Add escalation_id foreign key if not exists
ALTER TABLE public.ticket_attachments 
ADD COLUMN IF NOT EXISTS escalation_id UUID REFERENCES public.ticket_escalations(id) ON DELETE CASCADE;

-- 4. Enable RLS or recreate policies to ensure correct read/write permissions for all roles
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
