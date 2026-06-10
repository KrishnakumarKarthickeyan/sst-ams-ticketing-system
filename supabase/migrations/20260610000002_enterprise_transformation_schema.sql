-- RUN MANUALLY IN SUPABASE SQL EDITOR
-- Migration: 20260610000002_enterprise_transformation_schema.sql
-- Goal: Assist360 Enterprise Transformation Schema Expansion

-- 1. Create SLA Configuration Table
CREATE TABLE IF NOT EXISTS public.sla_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority VARCHAR(50) NOT NULL UNIQUE,
    resolution_hours NUMERIC(10,2) NOT NULL,
    response_hours NUMERIC(10,2) NOT NULL,
    escalation_hours NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed global defaults for SLA configurations
INSERT INTO public.sla_configuration (priority, resolution_hours, response_hours, escalation_hours, is_active)
VALUES
('Critical', 8.00, 1.00, 8.00, true),
('High', 16.00, 2.00, 16.00, true),
('Medium', 32.00, 8.00, 32.00, true),
('Low', 64.00, 24.00, 64.00, true)
ON CONFLICT (priority) DO UPDATE SET
  resolution_hours = EXCLUDED.resolution_hours,
  response_hours = EXCLUDED.response_hours,
  escalation_hours = EXCLUDED.escalation_hours,
  updated_at = CURRENT_TIMESTAMP;

-- Enable RLS for SLA Configuration
ALTER TABLE public.sla_configuration ENABLE ROW LEVEL SECURITY;

-- Read policy: all authenticated users can read SLA settings
DROP POLICY IF EXISTS "Allow authenticated read of SLA configuration" ON public.sla_configuration;
CREATE POLICY "Allow authenticated read of SLA configuration" 
ON public.sla_configuration FOR SELECT TO authenticated USING (true);

-- Write policies: Admins and Managers can configure SLA settings
DROP POLICY IF EXISTS "Allow manager/admin write of SLA configuration" ON public.sla_configuration;
CREATE POLICY "Allow manager/admin write of SLA configuration" 
ON public.sla_configuration FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SuperAdmin', 'Manager')
  )
);

-- 2. Alter Organizations Table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS internal_comments TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sla_template VARCHAR(100);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sla_critical_hours NUMERIC(10,2);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sla_high_hours NUMERIC(10,2);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sla_medium_hours NUMERIC(10,2);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sla_low_hours NUMERIC(10,2);

-- 3. Alter Customer Contracts Table
ALTER TABLE public.customer_contracts ADD COLUMN IF NOT EXISTS contract_value NUMERIC(15,2) DEFAULT 0.00;

-- 4. Alter Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_years NUMERIC(5,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_capacity_hours NUMERIC(5,2) DEFAULT 8.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_capacity_hours NUMERIC(5,2) DEFAULT 40.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_capacity_hours NUMERIC(5,2) DEFAULT 160.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_lead_id UUID REFERENCES public.profiles(id);

-- 5. Alter Organization Contacts Table
ALTER TABLE public.organization_contacts ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(100);
