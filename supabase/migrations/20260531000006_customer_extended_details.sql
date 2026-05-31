-- Migration: Add extended customer details (address, industry) to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS industry VARCHAR(255);
