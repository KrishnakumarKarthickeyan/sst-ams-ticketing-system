-- update_consultant_closure.sql
-- Add new columns to public.ticket_consultant_efforts to support multi-consultant closure workflows

ALTER TABLE public.ticket_consultant_efforts ADD COLUMN IF NOT EXISTS closure_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.ticket_consultant_efforts ADD COLUMN IF NOT EXISTS work_summary TEXT;
ALTER TABLE public.ticket_consultant_efforts ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
