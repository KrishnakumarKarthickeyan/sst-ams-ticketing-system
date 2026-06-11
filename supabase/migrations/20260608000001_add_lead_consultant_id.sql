-- Add lead_consultant_id column to public.tickets referencing profiles.id
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS lead_consultant_id UUID REFERENCES public.profiles(id);

-- Backfill lead_consultant_id using primary_consultant_id or assigned_consultant_id
UPDATE public.tickets
SET lead_consultant_id = COALESCE(primary_consultant_id, assigned_consultant_id)
WHERE lead_consultant_id IS NULL;
