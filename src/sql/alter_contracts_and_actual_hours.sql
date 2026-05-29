-- SQL Migration: Rework Customer Contracts & Ticket Actual Hours Columns
-- Run this in the Supabase SQL Editor.

-- ==========================================
-- 1. Alter customer_contracts Table
-- ==========================================
ALTER TABLE public.customer_contracts ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.customer_contracts ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE public.customer_contracts ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE public.customer_contracts ADD COLUMN IF NOT EXISTS total_contract_hours NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.customer_contracts ADD COLUMN IF NOT EXISTS monthly_allocated_hours NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.customer_contracts ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Populate new fields from existing ones if they exist
UPDATE public.customer_contracts
SET customer_id = COALESCE(customer_id, organization_id),
    contract_start_date = COALESCE(contract_start_date, start_date),
    contract_end_date = COALESCE(contract_end_date, end_date),
    total_contract_hours = COALESCE(total_contract_hours, total_hours),
    monthly_allocated_hours = COALESCE(monthly_allocated_hours, monthly_budget_hours),
    status = COALESCE(status, CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END);

-- Trigger to keep fields synchronized (backwards compatibility)
CREATE OR REPLACE FUNCTION public.sync_customer_contracts_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NULL THEN
        NEW.customer_id := NEW.organization_id;
    END IF;
    IF NEW.organization_id IS NULL THEN
        NEW.organization_id := NEW.customer_id;
    END IF;
    
    IF NEW.contract_start_date IS NULL THEN
        NEW.contract_start_date := NEW.start_date;
    END IF;
    IF NEW.start_date IS NULL THEN
        NEW.start_date := NEW.contract_start_date;
    END IF;
    
    IF NEW.contract_end_date IS NULL THEN
        NEW.contract_end_date := NEW.end_date;
    END IF;
    IF NEW.end_date IS NULL THEN
        NEW.end_date := NEW.contract_end_date;
    END IF;
    
    IF NEW.total_contract_hours IS NULL THEN
        NEW.total_contract_hours := NEW.total_hours;
    END IF;
    IF NEW.total_hours IS NULL THEN
        NEW.total_hours := NEW.total_contract_hours;
    END IF;
    
    IF NEW.monthly_allocated_hours IS NULL THEN
        NEW.monthly_allocated_hours := NEW.monthly_budget_hours;
    END IF;
    IF NEW.monthly_budget_hours IS NULL THEN
        NEW.monthly_budget_hours := NEW.monthly_allocated_hours;
    END IF;
    
    IF NEW.status IS NULL THEN
        NEW.status := CASE WHEN NEW.is_active THEN 'Active' ELSE 'Inactive' END;
    END IF;
    IF NEW.status = 'Active' THEN
        NEW.is_active := TRUE;
    ELSE
        NEW.is_active := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_customer_contracts_fields ON public.customer_contracts;
CREATE TRIGGER trg_sync_customer_contracts_fields
BEFORE INSERT OR UPDATE ON public.customer_contracts
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_contracts_fields();

-- ==========================================
-- 2. Alter ticket_actual_hours Table
-- ==========================================
ALTER TABLE public.ticket_actual_hours ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT TRUE;
ALTER TABLE public.ticket_actual_hours ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.ticket_actual_hours ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.ticket_actual_hours ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Sync existing approved hours from ticket_closure_requests
UPDATE public.ticket_actual_hours ah
SET approval_status = 'approved',
    approved_by = cr.manager_approved_by,
    approved_at = cr.manager_approved_at
FROM public.ticket_closure_requests cr
WHERE ah.closure_request_id = cr.id AND cr.status = 'Approved';

UPDATE public.ticket_actual_hours ah
SET approval_status = 'rejected'
FROM public.ticket_closure_requests cr
WHERE ah.closure_request_id = cr.id AND cr.status = 'Rejected';
