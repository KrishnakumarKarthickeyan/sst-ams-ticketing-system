-- SST SAP Support Desk Schema Update: Ticket Creation Master Alignment
-- Execute this script in the Supabase SQL Editor to support all Enterprise fields, request types, and module masters.

-- 1. Drop foreign key constraints on tables referencing public.sap_modules to allow column type modifications
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_sap_module_fkey;
ALTER TABLE public.ticket_modules DROP CONSTRAINT IF EXISTS ticket_modules_module_id_fkey;
ALTER TABLE public.knowledgebase_articles DROP CONSTRAINT IF EXISTS knowledgebase_articles_sap_module_fkey;

-- 2. Alter column types in target tables to VARCHAR(100) for maximum flexibility (breaking enum locks)
ALTER TABLE public.sap_modules ALTER COLUMN code TYPE VARCHAR(100);
ALTER TABLE public.tickets ALTER COLUMN sap_module TYPE VARCHAR(100);
ALTER TABLE public.ticket_modules ALTER COLUMN module_id TYPE VARCHAR(100);
ALTER TABLE public.knowledgebase_articles ALTER COLUMN sap_module TYPE VARCHAR(100);
ALTER TABLE public.tickets ALTER COLUMN category TYPE VARCHAR(100);
ALTER TABLE public.tickets ALTER COLUMN ticket_type TYPE VARCHAR(100);
ALTER TABLE public.tickets ALTER COLUMN functional_or_technical TYPE VARCHAR(100);

-- 3. Re-add foreign key constraints linking to the altered sap_modules table
ALTER TABLE public.tickets ADD CONSTRAINT tickets_sap_module_fkey FOREIGN KEY (sap_module) REFERENCES public.sap_modules(code);
ALTER TABLE public.ticket_modules ADD CONSTRAINT ticket_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.sap_modules(code) ON DELETE CASCADE;
ALTER TABLE public.knowledgebase_articles ADD CONSTRAINT knowledgebase_articles_sap_module_fkey FOREIGN KEY (sap_module) REFERENCES public.sap_modules(code);

-- 4. Add new columns to public.tickets and public.organizations
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS classification VARCHAR(100);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS business_impact_level VARCHAR(100);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS business_justification TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS customer_code VARCHAR(100);

-- 5. Seed the updated SAP Modules Master List (15 required enterprise modules)
INSERT INTO public.sap_modules (code, name, description) VALUES
('FICO', 'Financial Accounting and Controlling', 'SAP core finance, general ledger, accounts payable/receivable, asset accounting, cost center accounting.'),
('SD', 'Sales and Distribution', 'Sales order processing, shipping, billing, pricing condition records, credit management.'),
('MM', 'Materials Management', 'Procurement, inventory management, physical inventory, material master, purchasing, invoice verification.'),
('PP', 'Production Planning', 'MRP, shop floor control, BOMs, routing, capacity planning, production orders.'),
('PM', 'Plant Maintenance', 'Preventive maintenance, work orders, service notifications, equipment master.'),
('QM', 'Quality Management', 'Quality planning, inspection lots, quality certificates, notifications.'),
('HCM', 'Human Capital Management', 'Payroll, time evaluation, personnel administration, organizational management.'),
('SF EC', 'SuccessFactors Employee Central', 'Cloud HR core data management, organizational management, employee lifecycle.'),
('SF ECP', 'SuccessFactors Employee Central Payroll', 'Cloud-based payroll engine integrated with Employee Central.'),
('SF PMGM', 'SuccessFactors Performance and Goals Management', 'Goal plans, annual evaluations, continuous feedback.'),
('SF RCM', 'SuccessFactors Recruiting', 'Candidate sourcing, interviewing, hiring management.'),
('SAC', 'SAP Analytics Cloud', 'Cloud business intelligence, planning, enterprise reporting, dashboard design.'),
('ABAP', 'Advanced Business Application Programming', 'Custom code, user exits, screen enhancements, BAdIs, ALV reports, forms.'),
('BASIS', 'SAP System Administration', 'NetWeaver administration, authorizations, transports import, system health, backups.'),
('CPI', 'Cloud Integration', 'Middleware mapping, API adapters, EDI integrations, flow configuration.')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;
