-- SST SAP Support Desk Unified DB Migration & Schema Update Script
-- Execute this script in the Supabase SQL Editor to configure all missing columns, tables, RLS policies, and triggers.

-- ============================================================================
-- 1. Profiles Column Modifications
-- ============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS consultant_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS sap_modules VARCHAR(50)[],
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS role_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS skills TEXT;

-- ============================================================================
-- 2. Custom Types and Enums
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type_enum') THEN
        CREATE TYPE ticket_type_enum AS ENUM ('Incident', 'Service Request', 'Enhancement Request', 'Change Request', 'Training Request', 'Configuration Request', 'Report Request');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'functional_or_technical_enum') THEN
        CREATE TYPE functional_or_technical_enum AS ENUM ('Functional', 'Technical');
    END IF;
END $$;

-- ============================================================================
-- 3. Tickets Column Modifications
-- ============================================================================
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS ticket_type ticket_type_enum NOT NULL DEFAULT 'Incident',
ADD COLUMN IF NOT EXISTS functional_or_technical functional_or_technical_enum NOT NULL DEFAULT 'Functional',
ADD COLUMN IF NOT EXISTS classification VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_impact TEXT,
ADD COLUMN IF NOT EXISTS expected_resolution_date DATE,
ADD COLUMN IF NOT EXISTS business_impact_level VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_justification TEXT,
ADD COLUMN IF NOT EXISTS quoted_hours NUMERIC(6,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS raised_to_sap BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reopened_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_action_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_owner VARCHAR(255),
ADD COLUMN IF NOT EXISTS next_action_owner VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by_user UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS soft_delete_status VARCHAR(50) DEFAULT 'Active';

-- Alter ticket status column to VARCHAR(50) for maximum flexibility
ALTER TABLE public.tickets ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE public.tickets ALTER COLUMN ticket_type TYPE VARCHAR(100);
ALTER TABLE public.tickets ALTER COLUMN functional_or_technical TYPE VARCHAR(100);

-- Add customer_code to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS customer_code VARCHAR(100);

-- ============================================================================
-- 4. Create Stakeholder & Workflow Tables
-- ============================================================================

-- A. customer_contacts Table
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_secondary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B. ticket_modules Table
CREATE TABLE IF NOT EXISTS public.ticket_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    module_id public.sap_module_code NOT NULL REFERENCES public.sap_modules(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ticket_module UNIQUE(ticket_id, module_id)
);

-- C. ticket_delete_requests Table
CREATE TABLE IF NOT EXISTS public.ticket_delete_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    manager_approval VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    manager_approved_by UUID REFERENCES public.profiles(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    admin_approval VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    admin_approved_by UUID REFERENCES public.profiles(id),
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    final_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- D. ticket_escalations Table
CREATE TABLE IF NOT EXISTS public.ticket_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    escalated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium', -- e.g. Low, Medium, High
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- e.g. Pending, Investigating, Resolved, Rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E. ticket_hour_estimates Table
CREATE TABLE IF NOT EXISTS public.ticket_hour_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) REFERENCES public.tickets(id) ON DELETE CASCADE,
    consultant_id UUID REFERENCES public.profiles(id),
    functional_estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    technical_estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    total_estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'Submitted', -- 'Submitted', 'Revision Requested', 'Revision Approved', 'Revision Rejected'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES public.profiles(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- F. ticket_closure_requests Table
CREATE TABLE IF NOT EXISTS public.ticket_closure_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) REFERENCES public.tickets(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id),
    functional_actual_hours NUMERIC(6,2) DEFAULT 0.00,
    technical_actual_hours NUMERIC(6,2) DEFAULT 0.00,
    total_actual_hours NUMERIC(6,2) DEFAULT 0.00,
    work_completed_summary TEXT,
    root_cause TEXT,
    resolution_summary TEXT,
    pending_items TEXT,
    status VARCHAR(50) DEFAULT 'Pending Manager Approval', -- 'Pending Manager Approval', 'Approved', 'Rejected', 'Resubmitted'
    manager_approval_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    manager_approved_by UUID REFERENCES public.profiles(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_rejected_by UUID REFERENCES public.profiles(id),
    manager_rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    resubmitted_from_id UUID REFERENCES public.ticket_closure_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- G. ticket_consultant_efforts Table
CREATE TABLE IF NOT EXISTS public.ticket_consultant_efforts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) REFERENCES public.tickets(id) ON DELETE CASCADE,
    consultant_id UUID REFERENCES public.profiles(id),
    consultant_type VARCHAR(50) NOT NULL, -- 'Functional', 'Technical'
    estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    actual_hours NUMERIC(6,2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- H. ticket_mentions Table
CREATE TABLE IF NOT EXISTS public.ticket_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) REFERENCES public.tickets(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.ticket_comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID REFERENCES public.profiles(id),
    mentioned_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- I. ticket_comment_attachments Table
CREATE TABLE IF NOT EXISTS public.ticket_comment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES public.ticket_comments(id) ON DELETE CASCADE,
    ticket_id VARCHAR(50) REFERENCES public.tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- J. ticket_unlock_requests Table
CREATE TABLE IF NOT EXISTS public.ticket_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    closure_request_id UUID REFERENCES public.ticket_closure_requests(id) ON DELETE SET NULL,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    requested_change TEXT NOT NULL,
    remarks TEXT,
    attachment_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    manager_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    manager_rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. Ticket Efforts Column Modifications (Fortimesheet approvals)
-- ============================================================================
ALTER TABLE public.ticket_efforts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending Approval';
ALTER TABLE public.ticket_efforts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.ticket_efforts ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE public.ticket_efforts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ticket_efforts ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255);
ALTER TABLE public.ticket_efforts ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 6. Helper Security Functions & Profiles RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN (
        coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('SuperAdmin', 'Manager') OR
        coalesce(auth.jwt() ->> 'email', '') = 'manager@supportstudio.com' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('SuperAdmin', 'Manager')
        )
    );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;

CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_policy ON public.profiles FOR INSERT WITH CHECK (public.is_manager_or_admin());
CREATE POLICY profiles_update_policy ON public.profiles FOR UPDATE USING (public.is_manager_or_admin() OR id = auth.uid());
CREATE POLICY profiles_delete_policy ON public.profiles FOR DELETE USING (public.is_manager_or_admin());

-- ============================================================================
-- 7. Configure RLS Policies for New Tables
-- ============================================================================

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_read_policy ON public.organizations;
DROP POLICY IF EXISTS org_insert_policy ON public.organizations;
DROP POLICY IF EXISTS org_update_policy ON public.organizations;
DROP POLICY IF EXISTS org_delete_policy ON public.organizations;

CREATE POLICY org_read_policy ON public.organizations FOR SELECT TO authenticated USING (public.is_manager_or_admin() OR id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY org_insert_policy ON public.organizations FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin());
CREATE POLICY org_update_policy ON public.organizations FOR UPDATE TO authenticated USING (public.is_manager_or_admin());
CREATE POLICY org_delete_policy ON public.organizations FOR DELETE TO authenticated USING (public.is_manager_or_admin());

-- Customer Contracts
ALTER TABLE public.customer_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contracts_select_policy ON public.customer_contracts;
DROP POLICY IF EXISTS contracts_insert_policy ON public.customer_contracts;
DROP POLICY IF EXISTS contracts_update_policy ON public.customer_contracts;
DROP POLICY IF EXISTS contracts_delete_policy ON public.customer_contracts;

CREATE POLICY contracts_select_policy ON public.customer_contracts FOR SELECT TO authenticated USING (public.is_manager_or_admin() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY contracts_insert_policy ON public.customer_contracts FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin());
CREATE POLICY contracts_update_policy ON public.customer_contracts FOR UPDATE TO authenticated USING (public.is_manager_or_admin());
CREATE POLICY contracts_delete_policy ON public.customer_contracts FOR DELETE TO authenticated USING (public.is_manager_or_admin());

-- Customer Contacts
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contacts_access_policy ON public.customer_contacts;
CREATE POLICY contacts_access_policy ON public.customer_contacts FOR ALL TO authenticated USING (public.is_manager_or_admin() OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Tickets Access RLS
DROP POLICY IF EXISTS tickets_access_policy ON public.tickets;
CREATE POLICY tickets_access_policy ON public.tickets
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            assigned_consultant_id = auth.uid() OR
            id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

-- Ticket Comments
DROP POLICY IF EXISTS comments_access_policy ON public.ticket_comments;
CREATE POLICY comments_access_policy ON public.ticket_comments
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            NOT is_internal AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Ticket Attachments
DROP POLICY IF EXISTS attachments_access_policy ON public.ticket_attachments;
CREATE POLICY attachments_access_policy ON public.ticket_attachments
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Ticket Escalations
ALTER TABLE public.ticket_escalations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS escalations_access_policy ON public.ticket_escalations;
CREATE POLICY escalations_access_policy ON public.ticket_escalations
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Ticket Modules
ALTER TABLE public.ticket_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modules_access_policy ON public.ticket_modules;
CREATE POLICY modules_access_policy ON public.ticket_modules
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Delete Requests
ALTER TABLE public.ticket_delete_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delete_requests_access_policy ON public.ticket_delete_requests;
CREATE POLICY delete_requests_access_policy ON public.ticket_delete_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Hour Estimates
ALTER TABLE public.ticket_hour_estimates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hour_estimates_access_policy ON public.ticket_hour_estimates;
CREATE POLICY hour_estimates_access_policy ON public.ticket_hour_estimates
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        ))
    );

-- Closure Requests
ALTER TABLE public.ticket_closure_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS closure_requests_access_policy ON public.ticket_closure_requests;
CREATE POLICY closure_requests_access_policy ON public.ticket_closure_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Consultant Efforts
ALTER TABLE public.ticket_consultant_efforts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS efforts_access_policy ON public.ticket_consultant_efforts;
CREATE POLICY efforts_access_policy ON public.ticket_consultant_efforts
    FOR ALL TO authenticated
    USING (
        (is_deleted = FALSE) AND (
            public.is_manager_or_admin() OR
            consultant_id = auth.uid()
        )
    );

-- Mentions
ALTER TABLE public.ticket_mentions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS all_access_mentions ON public.ticket_mentions;
CREATE POLICY all_access_mentions ON public.ticket_mentions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Comment Attachments
ALTER TABLE public.ticket_comment_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comment_attachments_access_policy ON public.ticket_comment_attachments;
CREATE POLICY comment_attachments_access_policy ON public.ticket_comment_attachments
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        )) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    );

-- Unlock Requests
ALTER TABLE public.ticket_unlock_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unlock_requests_access_policy ON public.ticket_unlock_requests;
CREATE POLICY unlock_requests_access_policy ON public.ticket_unlock_requests
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM public.tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM public.ticket_consultant_efforts WHERE consultant_id = auth.uid() AND is_deleted = FALSE)
        ))
    );

-- Ticket Efforts (Timesheet table)
ALTER TABLE public.ticket_efforts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ticket_efforts_access_policy ON public.ticket_efforts;
CREATE POLICY ticket_efforts_access_policy ON public.ticket_efforts
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        consultant_id = auth.uid()
    );

-- CSAT Ratings
ALTER TABLE public.satisfaction_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS csat_select_policy ON public.satisfaction_ratings;
DROP POLICY IF EXISTS csat_insert_policy ON public.satisfaction_ratings;
CREATE POLICY csat_select_policy ON public.satisfaction_ratings FOR SELECT TO authenticated USING (public.is_manager_or_admin() OR ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY csat_insert_policy ON public.satisfaction_ratings FOR INSERT TO authenticated WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Knowledgebase Articles
ALTER TABLE public.knowledgebase_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_select_policy ON public.knowledgebase_articles;
DROP POLICY IF EXISTS kb_write_policy ON public.knowledgebase_articles;
CREATE POLICY kb_select_policy ON public.knowledgebase_articles FOR SELECT TO authenticated USING ((NOT is_internal) OR ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager', 'Consultant')));
CREATE POLICY kb_write_policy ON public.knowledgebase_articles FOR ALL TO authenticated USING (public.is_manager_or_admin()) WITH CHECK (public.is_manager_or_admin());

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_access_policy ON public.notifications;
CREATE POLICY notifications_access_policy ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 8. Add Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tickets_type ON public.tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_escalations_ticket ON public.ticket_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.customer_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ticket_modules_ticket ON public.ticket_modules(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_delete_requests_ticket ON public.ticket_delete_requests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_ticket ON public.ticket_unlock_requests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_efforts_deleted ON public.ticket_consultant_efforts(is_deleted);

-- ============================================================================
-- 9. Realtime Publication Table Additions
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add any missing tables to realtime replication
        -- We catch warnings if tables are already added
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE 
                public.tickets, 
                public.ticket_comments, 
                public.ticket_efforts, 
                public.satisfaction_ratings, 
                public.ticket_modules, 
                public.ticket_delete_requests, 
                public.ticket_hour_estimates, 
                public.ticket_closure_requests, 
                public.ticket_consultant_efforts, 
                public.ticket_unlock_requests, 
                public.ticket_comment_attachments,
                public.ticket_attachments,
                public.notifications;
        EXCEPTION WHEN OTHERS THEN
            -- Table might already be in publication or publication is locked
            NULL;
        END;
    END IF;
END $$;

-- ============================================================================
-- 10. Default Manager Seeding into public.profiles (Auth User Seeded Separately)
-- ============================================================================
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3',
    'manager@supportstudio.com',
    'SAP Manager',
    'Manager',
    TRUE,
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- Seed Default Customer Contacts for existing organizations
INSERT INTO public.customer_contacts (organization_id, name, designation, email, phone, is_primary, is_secondary)
SELECT 
    id, 
    'Sarah Jenkins', 
    'IT Logistics Director', 
    'customer@sap.com', 
    '+1 (555) 019-2834', 
    TRUE, 
    FALSE
FROM public.organizations
WHERE name = 'Apex Global Industries'
ON CONFLICT DO NOTHING;

INSERT INTO public.customer_contacts (organization_id, name, designation, email, phone, is_primary, is_secondary)
SELECT 
    id, 
    'David Miller', 
    'Director of Finance Operations', 
    'david@titanenergy.com', 
    '+1 (555) 048-9321', 
    TRUE, 
    FALSE
FROM public.organizations
WHERE name = 'Titan Energy Corp'
ON CONFLICT DO NOTHING;
