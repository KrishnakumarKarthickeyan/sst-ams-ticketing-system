-- SQL Schema Updates for SST SAP Support Desk Customer Portal Redesign

-- 1. Create Enums if they do not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type_enum') THEN
        CREATE TYPE ticket_type_enum AS ENUM ('Incident', 'Service Request', 'Enhancement Request', 'Change Request', 'Training Request', 'Configuration Request', 'Report Request');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'functional_or_technical_enum') THEN
        CREATE TYPE functional_or_technical_enum AS ENUM ('Functional', 'Technical');
    END IF;
END $$;

-- 2. Alter TICKETS Table to support new properties
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS ticket_type ticket_type_enum NOT NULL DEFAULT 'Incident',
ADD COLUMN IF NOT EXISTS functional_or_technical functional_or_technical_enum NOT NULL DEFAULT 'Functional',
ADD COLUMN IF NOT EXISTS business_impact TEXT,
ADD COLUMN IF NOT EXISTS expected_resolution_date DATE,
ADD COLUMN IF NOT EXISTS quoted_hours NUMERIC(6,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS raised_to_sap BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reopened_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_action_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_owner VARCHAR(255),
ADD COLUMN IF NOT EXISTS next_action_owner VARCHAR(255);

-- 3. Create TICKET ESCALATIONS Table
CREATE TABLE IF NOT EXISTS ticket_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    escalated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium', -- e.g. Low, Medium, High
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- e.g. Pending, Investigating, Resolved, Rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on ticket_escalations
ALTER TABLE ticket_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY escalations_access_policy ON ticket_escalations
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'SuperAdmin' OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Manager') OR
        (ticket_id IN (SELECT id FROM tickets WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())))
    );

-- 4. Create CUSTOMER CONTACTS Table
CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_secondary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on customer_contacts
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_access_policy ON customer_contacts
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'SuperAdmin' OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Manager') OR
        (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    );

-- 5. Seed Customer Contacts for existing organizations
-- Truncate / Insert default contacts safely
INSERT INTO customer_contacts (organization_id, name, designation, email, phone, is_primary, is_secondary)
SELECT 
    id, 
    'Sarah Jenkins', 
    'IT Logistics Director', 
    'customer@sap.com', 
    '+1 (555) 019-2834', 
    TRUE, 
    FALSE
FROM organizations
WHERE name = 'Apex Global Industries'
ON CONFLICT DO NOTHING;

INSERT INTO customer_contacts (organization_id, name, designation, email, phone, is_primary, is_secondary)
SELECT 
    id, 
    'David Miller', 
    'Director of Finance Operations', 
    'david@titanenergy.com', 
    '+1 (555) 048-9321', 
    TRUE, 
    FALSE
FROM organizations
WHERE name = 'Titan Energy Corp'
ON CONFLICT DO NOTHING;

-- 6. Add Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_escalations_ticket ON ticket_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON customer_contacts(organization_id);

-- 7. Add columns for Customer Portal UI/UX Redesign
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by_user UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS soft_delete_status VARCHAR(50) DEFAULT 'Active';

-- 8. Create TICKET MODULES mapping table (for multi-module support)
CREATE TABLE IF NOT EXISTS ticket_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    module_id sap_module_code NOT NULL REFERENCES sap_modules(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ticket_module UNIQUE(ticket_id, module_id)
);

-- Enable RLS on ticket_modules
ALTER TABLE ticket_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY modules_access_policy ON ticket_modules
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'SuperAdmin' OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Manager') OR
        (ticket_id IN (SELECT id FROM tickets WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())))
    );

-- 9. Create TICKET DELETE REQUESTS Table (for soft-delete approval workflow)
CREATE TABLE IF NOT EXISTS ticket_delete_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    manager_approval VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    manager_approved_by UUID REFERENCES profiles(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    admin_approval VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    admin_approved_by UUID REFERENCES profiles(id),
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    final_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on ticket_delete_requests
ALTER TABLE ticket_delete_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY delete_requests_access_policy ON ticket_delete_requests
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'SuperAdmin' OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Manager') OR
        (ticket_id IN (SELECT id FROM tickets WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())))
    );

-- Add Index for optimizations
CREATE INDEX IF NOT EXISTS idx_ticket_modules_ticket ON ticket_modules(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_delete_requests_ticket ON ticket_delete_requests(ticket_id);
