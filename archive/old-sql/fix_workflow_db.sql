-- SQL Migration Script to Fix Ticketing System Database Mismatches & RLS

-- 1. Alter ticket status column to VARCHAR(50) for maximum flexibility and status sync
ALTER TABLE tickets ALTER COLUMN status TYPE VARCHAR(50);

-- 2. Fix ticket_id types in consultant workflow tables to match tickets(id) VARCHAR(50)
-- Drop existing foreign keys first if they exist
ALTER TABLE ticket_hour_estimates DROP CONSTRAINT IF EXISTS ticket_hour_estimates_ticket_id_fkey;
ALTER TABLE ticket_hour_estimates ALTER COLUMN ticket_id TYPE VARCHAR(50);
ALTER TABLE ticket_hour_estimates ADD CONSTRAINT ticket_hour_estimates_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_closure_requests DROP CONSTRAINT IF EXISTS ticket_closure_requests_ticket_id_fkey;
ALTER TABLE ticket_closure_requests ALTER COLUMN ticket_id TYPE VARCHAR(50);
ALTER TABLE ticket_closure_requests ADD CONSTRAINT ticket_closure_requests_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_consultant_efforts DROP CONSTRAINT IF EXISTS ticket_consultant_efforts_ticket_id_fkey;
ALTER TABLE ticket_consultant_efforts ALTER COLUMN ticket_id TYPE VARCHAR(50);
ALTER TABLE ticket_consultant_efforts ADD CONSTRAINT ticket_consultant_efforts_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_mentions DROP CONSTRAINT IF EXISTS ticket_mentions_ticket_id_fkey;
ALTER TABLE ticket_mentions ALTER COLUMN ticket_id TYPE VARCHAR(50);
ALTER TABLE ticket_mentions ADD CONSTRAINT ticket_mentions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_comment_attachments DROP CONSTRAINT IF EXISTS ticket_comment_attachments_ticket_id_fkey;
ALTER TABLE ticket_comment_attachments ALTER COLUMN ticket_id TYPE VARCHAR(50);
ALTER TABLE ticket_comment_attachments ADD CONSTRAINT ticket_comment_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

-- 3. Add status and rejection_reason columns to ticket_efforts table for timesheet approvals
ALTER TABLE ticket_efforts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending Approval';
ALTER TABLE ticket_efforts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE ticket_efforts ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE ticket_efforts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ticket_efforts ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255);
ALTER TABLE ticket_efforts ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- 4. Re-configure Row Level Security (RLS) Policies

-- Tickets access RLS:
-- Customer: View own organization tickets
-- Consultant: View assigned tickets (lead or allocated resources)
-- Manager/SuperAdmin: View all
DROP POLICY IF EXISTS tickets_access_policy ON tickets;
CREATE POLICY tickets_access_policy ON tickets
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            assigned_consultant_id = auth.uid() OR
            id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        )) OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Customer' AND 
            organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    );

-- Ticket Comments access RLS (respects internal visibility):
DROP POLICY IF EXISTS comments_access_policy ON ticket_comments;
CREATE POLICY comments_access_policy ON ticket_comments
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        )) OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Customer' AND 
            NOT is_internal AND 
            ticket_id IN (SELECT id FROM tickets WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())))
    );

-- Ticket Attachments access RLS:
DROP POLICY IF EXISTS attachments_access_policy ON ticket_attachments;
CREATE POLICY attachments_access_policy ON ticket_attachments
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        )) OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM tickets WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())))
    );

-- Ticket Comment Attachments access RLS:
DROP POLICY IF EXISTS comment_attachments_access_policy ON ticket_comment_attachments;
CREATE POLICY comment_attachments_access_policy ON ticket_comment_attachments
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        )) OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM tickets WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())))
    );

-- Ticket Consultant Efforts RLS:
DROP POLICY IF EXISTS efforts_access_policy ON ticket_consultant_efforts;
CREATE POLICY efforts_access_policy ON ticket_consultant_efforts
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        ))
    );

-- Ticket hour estimates RLS:
DROP POLICY IF EXISTS all_access_hour_estimates ON ticket_hour_estimates;
CREATE POLICY hour_estimates_access_policy ON ticket_hour_estimates
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        ))
    );

-- Ticket closure requests RLS:
DROP POLICY IF EXISTS all_access_closure_requests ON ticket_closure_requests;
CREATE POLICY closure_requests_access_policy ON ticket_closure_requests
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        )) OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Customer' AND 
            ticket_id IN (SELECT id FROM tickets WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())))
    );

-- Ticket Unlock Requests RLS:
DROP POLICY IF EXISTS unlock_requests_access_policy ON ticket_unlock_requests;
CREATE POLICY unlock_requests_access_policy ON ticket_unlock_requests
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager') OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'Consultant' AND (
            ticket_id IN (SELECT id FROM tickets WHERE assigned_consultant_id = auth.uid()) OR
            ticket_id IN (SELECT ticket_id FROM ticket_consultant_efforts WHERE consultant_id = auth.uid())
        ))
    );

-- 5. Enable Supabase Realtime Replication for workflow tables
-- Check if publication exists first, then add tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            tickets, 
            ticket_comments, 
            ticket_efforts, 
            satisfaction_ratings, 
            ticket_modules, 
            ticket_delete_requests, 
            ticket_hour_estimates, 
            ticket_closure_requests, 
            ticket_consultant_efforts, 
            ticket_unlock_requests, 
            ticket_comment_attachments,
            ticket_attachments,
            notifications;
    END IF;
END $$;
