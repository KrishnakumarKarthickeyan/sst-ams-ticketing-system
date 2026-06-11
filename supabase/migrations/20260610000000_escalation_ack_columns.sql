-- Add missing columns to tickets table for complete escalation lifecycle
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS escalation_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_acknowledged_by UUID REFERENCES public.profiles(id);
