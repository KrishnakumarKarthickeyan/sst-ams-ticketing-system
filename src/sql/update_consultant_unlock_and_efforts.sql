-- SQL Migration script to support Manager Unlock Requests and fix Consultant Efforts soft-deletes and Comment Attachments

-- 1. Create ticket_unlock_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    closure_request_id UUID REFERENCES ticket_closure_requests(id) ON DELETE SET NULL,
    requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    requested_change TEXT NOT NULL,
    remarks TEXT,
    attachment_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    manager_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    manager_rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add is_deleted, deleted_at, and deleted_by fields to ticket_consultant_efforts
ALTER TABLE ticket_consultant_efforts 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Enable RLS on ticket_unlock_requests
ALTER TABLE ticket_unlock_requests ENABLE ROW LEVEL SECURITY;

-- 4. Re-create RLS policy for ticket_unlock_requests
DROP POLICY IF EXISTS unlock_requests_access_policy ON ticket_unlock_requests;
CREATE POLICY unlock_requests_access_policy ON ticket_unlock_requests
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'SuperAdmin' OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Manager') OR
        (ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()))
    );

-- 5. Re-create RLS policy for ticket_consultant_efforts with is_deleted filter
DROP POLICY IF EXISTS efforts_access_policy ON ticket_consultant_efforts;
CREATE POLICY efforts_access_policy ON ticket_consultant_efforts
    FOR ALL TO authenticated
    USING (
        (is_deleted = false) AND (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'SuperAdmin' OR
            ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Manager') OR
            (ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()))
        )
    );

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_unlock_requests_ticket ON ticket_unlock_requests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_efforts_deleted ON ticket_consultant_efforts(is_deleted);
