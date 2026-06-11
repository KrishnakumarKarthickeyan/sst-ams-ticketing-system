-- Migration to add escalation_reason to public.tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
