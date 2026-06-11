-- Ensure the 'SST SAP Operations' organization exists
INSERT INTO public.organizations (name)
VALUES ('SST SAP Operations')
ON CONFLICT (name) DO NOTHING;

-- Set organization of all Manager profiles to 'SST SAP Operations'
UPDATE public.profiles
SET organization_id = (SELECT id FROM public.organizations WHERE name = 'SST SAP Operations')
WHERE role = 'Manager';
