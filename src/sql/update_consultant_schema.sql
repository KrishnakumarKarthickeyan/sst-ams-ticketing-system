-- SQL Schema Updates for Consultant Module, Hour Estimates, Closure Requests, Efforts and Mentions/Attachments

-- 1. ticket_hour_estimates table
CREATE TABLE IF NOT EXISTS ticket_hour_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    consultant_id UUID REFERENCES profiles(id),
    functional_estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    technical_estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    total_estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'Submitted', -- 'Submitted', 'Revision Requested', 'Revision Approved', 'Revision Rejected'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES profiles(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ticket_closure_requests table
CREATE TABLE IF NOT EXISTS ticket_closure_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES profiles(id),
    functional_actual_hours NUMERIC(6,2) DEFAULT 0.00,
    technical_actual_hours NUMERIC(6,2) DEFAULT 0.00,
    total_actual_hours NUMERIC(6,2) DEFAULT 0.00,
    work_completed_summary TEXT,
    root_cause TEXT,
    resolution_summary TEXT,
    pending_items TEXT,
    status VARCHAR(50) DEFAULT 'Pending Manager Approval', -- 'Pending Manager Approval', 'Approved', 'Rejected', 'Resubmitted'
    manager_approval_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    manager_approved_by UUID REFERENCES profiles(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_rejected_by UUID REFERENCES profiles(id),
    manager_rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    resubmitted_from_id UUID REFERENCES ticket_closure_requests(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ticket_consultant_efforts table
CREATE TABLE IF NOT EXISTS ticket_consultant_efforts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    consultant_id UUID REFERENCES profiles(id),
    consultant_type VARCHAR(50) NOT NULL, -- 'Functional', 'Technical'
    estimated_hours NUMERIC(6,2) DEFAULT 0.00,
    actual_hours NUMERIC(6,2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ticket_mentions table
CREATE TABLE IF NOT EXISTS ticket_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID REFERENCES profiles(id),
    mentioned_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ticket_comment_attachments table
CREATE TABLE IF NOT EXISTS ticket_comment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on all new tables
ALTER TABLE ticket_hour_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_closure_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_consultant_efforts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comment_attachments ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for authenticated users
CREATE POLICY all_access_hour_estimates ON ticket_hour_estimates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY all_access_closure_requests ON ticket_closure_requests
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY all_access_consultant_efforts ON ticket_consultant_efforts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY all_access_mentions ON ticket_mentions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY all_access_comment_attachments ON ticket_comment_attachments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
