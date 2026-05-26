-- Production Seed Data for SAP Ticketing System
-- Enables default Manager account and Master Metadata

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Seed Default SAP Manager account into auth.users (Supabase Authentication Schema)
-- Login Email: manager@supportstudio.com
-- Login Password: Manager@12345
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3',
    'authenticated',
    'authenticated',
    'manager@supportstudio.com',
    crypt('Manager@12345', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "SAP Manager", "role": "Manager"}',
    FALSE,
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- 3. Seed Default SAP Manager Profile into public.profiles
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    organization_id,
    is_active,
    created_at,
    updated_at
) VALUES (
    '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3',
    'manager@supportstudio.com',
    'SAP Manager',
    'Manager',
    NULL,
    TRUE,
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- 4. Seed SAP Modules (if not already existing)
INSERT INTO sap_modules (code, name, description) VALUES
('FICO', 'Financial Accounting and Controlling', 'SAP core finance, general ledger, accounts payable/receivable, asset accounting, cost center accounting.'),
('MM', 'Materials Management', 'Procurement, inventory management, physical inventory, material master, purchasing, invoice verification.'),
('SD', 'Sales and Distribution', 'Sales order processing, shipping, billing, pricing condition records, credit management.'),
('PP', 'Production Planning', 'MRP, shop floor control, BOMs, routing, capacity planning, production orders.'),
('PM', 'Plant Maintenance', 'Preventive maintenance, work orders, service notifications, equipment master.'),
('QM', 'Quality Management', 'Quality planning, inspection lots, quality certificates, notifications.'),
('HCM', 'Human Capital Management', 'Payroll, time evaluation, personnel administration, organizational management.'),
('SuccessFactors', 'Cloud Human Experience Suite', 'SuccessFactors employee central, recruiting, performance management.'),
('BASIS', 'SAP System Administration', 'NetWeaver administration, authorizations, transports import, system health, backups.'),
('ABAP', 'Advanced Business Application Programming', 'Custom code, user exits, screen enhancements, BAdIs, ALV reports, forms.'),
('Security/GRC', 'Governance, Risk, and Compliance', 'SAP security policies, role design, user provisioning, audit logging.'),
('CPI/Integration', 'Cloud Integration / PI/PO', 'Middleware mapping, API adapters, EDI integrations, flow configuration.'),
('BW/BI', 'Business Warehouse / Intelligence', 'SAP data warehousing, analytics modeling, SAC dashboards, BEx queries.'),
('Fiori', 'SAP User Experience Interface', 'Fiori launchpad setup, custom Fiori apps, OData service generation.'),
('TRM', 'Treasury and Risk Management', 'Cash flow analysis, risk mitigation, transaction manager.')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed SLA Policies (if not already existing)
INSERT INTO sla_policies (priority, response_time_hours, resolution_time_hours, warning_threshold_percent) VALUES
('Critical', 1, 4, 75),
('High', 2, 8, 80),
('Medium', 8, 48, 80),
('Low', 24, 120, 90)
ON CONFLICT (priority) DO NOTHING;

-- 6. Seed Knowledgebase Categories (if not already existing)
INSERT INTO knowledgebase_categories (name, slug, description) VALUES
('Functional Guides', 'functional-guides', 'Step-by-step guides for FICO, SD, MM transactions and standard behaviors.'),
('Technical Optimization', 'technical-optimization', 'ABAP development standards, performance tuning, and database optimization tips.'),
('BASIS & Transports', 'basis-transports', 'Transports releasing rules, system copy protocols, and connection maintenance.'),
('System Integration', 'system-integration', 'CPI integration mapping guides, API endpoints configurations, and RFC logs.')
ON CONFLICT (slug) DO NOTHING;
