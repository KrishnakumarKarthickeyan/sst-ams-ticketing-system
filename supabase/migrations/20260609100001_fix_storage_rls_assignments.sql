-- RUN MANUALLY — Fix storage bucket RLS to include ticket_assignments for consultants
-- The existing policy only checks assigned_consultant_id and primary_consultant_id,
-- but misses consultants added via ticket_assignments table.

DROP POLICY IF EXISTS "Access to ticket attachments" ON storage.objects;

CREATE POLICY "Access to ticket attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'sap-tickets' AND (
    -- Admins and Managers have unrestricted access
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('SuperAdmin', 'Manager')
    )
    OR
    -- Consultant assigned to the ticket (via direct assignment or ticket_assignments)
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.tickets t ON (
        t.assigned_consultant_id = p.id OR 
        t.primary_consultant_id = p.id OR
        t.id IN (SELECT ta.ticket_id FROM public.ticket_assignments ta WHERE ta.consultant_id = p.id AND ta.active = TRUE)
      )
      WHERE p.id = auth.uid()
      AND p.role = 'Consultant'
      AND t.id = (storage.foldername(name))[1]
    )
    OR
    -- Customer belonging to the ticket's organization
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.tickets t ON t.organization_id = p.organization_id
      WHERE p.id = auth.uid()
      AND p.role = 'Customer'
      AND t.id = (storage.foldername(name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'sap-tickets' AND (
    -- Admins and Managers have unrestricted access
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('SuperAdmin', 'Manager')
    )
    OR
    -- Consultant assigned to the ticket
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.tickets t ON (
        t.assigned_consultant_id = p.id OR 
        t.primary_consultant_id = p.id OR
        t.id IN (SELECT ta.ticket_id FROM public.ticket_assignments ta WHERE ta.consultant_id = p.id AND ta.active = TRUE)
      )
      WHERE p.id = auth.uid()
      AND p.role = 'Consultant'
      AND t.id = (storage.foldername(name))[1]
    )
    OR
    -- Customer belonging to the ticket's organization
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.tickets t ON t.organization_id = p.organization_id
      WHERE p.id = auth.uid()
      AND p.role = 'Customer'
      AND t.id = (storage.foldername(name))[1]
    )
  )
);
