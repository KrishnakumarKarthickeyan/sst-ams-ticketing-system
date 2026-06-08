-- Create organization_contacts table
CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  designation VARCHAR NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_secondary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create organization_contact_tags table
CREATE TABLE IF NOT EXISTS public.organization_contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.organization_contacts(id) ON DELETE CASCADE,
  organization_name VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(contact_id, organization_name)
);

-- Enable RLS
ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_contact_tags ENABLE ROW LEVEL SECURITY;

-- Policies for organization_contacts SELECT
CREATE POLICY "Read contacts based on role and organization tags" ON public.organization_contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    ) OR EXISTS (
      SELECT 1 FROM public.organization_contact_tags oct
      JOIN public.profiles p ON p.id = auth.uid()
      JOIN public.organizations o ON o.id = p.organization_id
      WHERE oct.contact_id = organization_contacts.id
      AND oct.organization_name = o.name
    )
  );

-- Policies for organization_contacts INSERT, UPDATE, DELETE
CREATE POLICY "Admins/Managers can insert contacts" ON public.organization_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );

CREATE POLICY "Admins/Managers can update contacts" ON public.organization_contacts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );

CREATE POLICY "Admins/Managers can delete contacts" ON public.organization_contacts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );

-- Policies for organization_contact_tags SELECT
CREATE POLICY "Read tags based on role and organization" ON public.organization_contact_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.organizations o ON o.id = p.organization_id
      WHERE p.id = auth.uid()
      AND organization_contact_tags.organization_name = o.name
    )
  );

-- Policies for organization_contact_tags INSERT, UPDATE, DELETE
CREATE POLICY "Admins/Managers can insert tags" ON public.organization_contact_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );

CREATE POLICY "Admins/Managers can update tags" ON public.organization_contact_tags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );

CREATE POLICY "Admins/Managers can delete tags" ON public.organization_contact_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );
