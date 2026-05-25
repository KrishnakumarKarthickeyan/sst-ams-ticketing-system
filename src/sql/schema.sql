-- SST SAP Support Desk Database Schema
-- Compatible with Supabase PostgreSQL

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create CUSTOM TYPES & ENUMS
CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Manager', 'Consultant', 'Customer');
CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE ticket_status AS ENUM ('New', 'Assigned', 'In Progress', 'Waiting for Customer', 'Waiting for Internal Team', 'Resolved', 'Closed', 'Reopened');
CREATE TYPE contract_type AS ENUM ('AMS', 'Implementation Support', 'Rollout Support', 'Migration Support', 'Upgrade Support', 'Hypercare Support');
CREATE TYPE sap_module_code AS ENUM ('FICO', 'MM', 'SD', 'PP', 'PM', 'QM', 'HCM', 'SuccessFactors', 'BASIS', 'ABAP', 'Security/GRC', 'CPI/Integration', 'BW/BI', 'Fiori', 'TRM');
CREATE TYPE issue_category AS ENUM ('Functional Issue', 'Technical Issue', 'Authorization Issue', 'Integration Issue', 'Performance Issue', 'Master Data Issue', 'Configuration Issue', 'Enhancement Request', 'Bug Fix', 'Training / How-to Support');

-- 2. Create ORGANIZATIONS Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create PROFILES Table (Extends Supabase Auth users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Customer',
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create SAP MODULES Table
CREATE TABLE sap_modules (
    code sap_module_code PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 5. Create CUSTOMER CONTRACTS Table
CREATE TABLE customer_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contract_type contract_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_hours NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    used_hours NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monthly_budget_hours NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create SLA POLICIES Table
CREATE TABLE sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority ticket_priority NOT NULL UNIQUE,
    response_time_hours INT NOT NULL,
    resolution_time_hours INT NOT NULL,
    warning_threshold_percent INT DEFAULT 80,
    escalation_role user_role DEFAULT 'Manager',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create TICKETS Table
CREATE TABLE tickets (
    id VARCHAR(50) PRIMARY KEY, -- Auto-formatted, e.g. "SST-FICO-1001"
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    sap_module sap_module_code NOT NULL REFERENCES sap_modules(code),
    category issue_category NOT NULL,
    priority ticket_priority NOT NULL DEFAULT 'Medium',
    status ticket_status NOT NULL DEFAULT 'New',
    assigned_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_consultant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sla_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    description TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    root_cause TEXT,
    resolution_summary TEXT,
    billable BOOLEAN NOT NULL DEFAULT TRUE,
    escalation_flag BOOLEAN NOT NULL DEFAULT FALSE,
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    transport_request VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create TICKET COMMENTS Table
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create TICKET ATTACHMENTS Table
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Create TICKET HISTORY (Audit log for ticket transitions)
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    field_changed VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Create TICKET EFFORTS Table
CREATE TABLE ticket_efforts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    hours_logged NUMERIC(5,2) NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    billable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Create KNOWLEDGEBASE CATEGORIES Table
CREATE TABLE knowledgebase_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

-- 13. Create KNOWLEDGEBASE ARTICLES Table
CREATE TABLE knowledgebase_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES knowledgebase_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    sap_module sap_module_code REFERENCES sap_modules(code),
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    ratings_count INT DEFAULT 0,
    ratings_sum INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Create SATISFACTION RATINGS Table
CREATE TABLE satisfaction_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Create NOTIFICATIONS Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    ticket_id VARCHAR(50) REFERENCES tickets(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Create AI CHAT SESSIONS & MESSAGES Table
CREATE TABLE ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Create AUDIT LOGS Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for Query Optimization
CREATE INDEX idx_tickets_org ON tickets(organization_id);
CREATE INDEX idx_tickets_consultant ON tickets(assigned_consultant_id);
CREATE INDEX idx_tickets_manager ON tickets(assigned_manager_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX idx_efforts_ticket ON ticket_efforts(ticket_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_kb_articles_sap ON knowledgebase_articles(sap_module);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_efforts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledgebase_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_ratings ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Helpers (Mocking policies that are set up in Supabase)
-- 1. Organizations: SuperAdmin/Manager can see all, customers only their own.
CREATE POLICY org_read_policy ON organizations
    FOR SELECT TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('SuperAdmin', 'Manager') OR
        id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- 2. Tickets:
-- Customer: only tickets of their organization.
-- Consultant: only tickets assigned to them.
-- Manager: tickets for customers/modules under active managers, or all for convenience.
-- SuperAdmin: full access.
CREATE POLICY tickets_access_policy ON tickets
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'SuperAdmin' OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND assigned_consultant_id = auth.uid()) OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Customer' AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    );

-- SEED MOCK MASTER DATA
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
('TRM', 'Treasury and Risk Management', 'Cash flow analysis, risk mitigation, transaction manager.');

INSERT INTO sla_policies (priority, response_time_hours, resolution_time_hours, warning_threshold_percent) VALUES
('Critical', 1, 4, 75),  -- P1
('High', 2, 8, 80),      -- P2
('Medium', 8, 48, 80),    -- P3
('Low', 24, 120, 90);    -- P4

INSERT INTO knowledgebase_categories (name, slug, description) VALUES
('Functional Guides', 'functional-guides', 'Step-by-step guides for FICO, SD, MM transactions and standard behaviors.'),
('Technical Optimization', 'technical-optimization', 'ABAP development standards, performance tuning, and database optimization tips.'),
('BASIS & Transports', 'basis-transports', 'Transports releasing rules, system copy protocols, and connection maintenance.'),
('System Integration', 'system-integration', 'CPI integration mapping guides, API endpoints configurations, and RFC logs.');
