-- Initialize private storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sap-tickets', 'sap-tickets', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = 10485760;

-- Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing access policies if any exist
DROP POLICY IF EXISTS "Access to ticket attachments" ON storage.objects;

-- Create policy allowing stakeholders (Admins, Managers, assigned consultants, or customers in same org) to upload/view/delete
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
    -- Consultant assigned to the ticket
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.tickets t ON (t.assigned_consultant_id = p.id OR t.primary_consultant_id = p.id)
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
      JOIN public.tickets t ON (t.assigned_consultant_id = p.id OR t.primary_consultant_id = p.id)
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
