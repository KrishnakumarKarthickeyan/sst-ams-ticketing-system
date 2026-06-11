-- MIGRATION: landing_leads — lead capture for the public landing page
-- (waitlist signups, demo requests, contact-sales messages).
--
-- Access model: the public marketing page may INSERT (anon + authenticated),
-- nobody can read rows back through the API except Managers/SuperAdmins.

CREATE TABLE IF NOT EXISTS public.landing_leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type   TEXT NOT NULL CHECK (lead_type IN ('waitlist', 'demo', 'contact')),
  name        TEXT NOT NULL,
  company     TEXT,
  email       TEXT NOT NULL,
  phone       TEXT,
  team_size   TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_leads_created_idx ON public.landing_leads (created_at DESC);

ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_leads_insert ON public.landing_leads;
CREATE POLICY landing_leads_insert ON public.landing_leads
FOR INSERT TO anon, authenticated
WITH CHECK (
  -- basic shape constraints to keep junk rows out of an open endpoint
  char_length(name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 5 AND 320
  AND position('@' IN email) > 1
);

DROP POLICY IF EXISTS landing_leads_admin_select ON public.landing_leads;
CREATE POLICY landing_leads_admin_select ON public.landing_leads
FOR SELECT TO authenticated
USING (public.is_manager_or_admin());
