-- SQL Migration script to fix missing and incorrect RLS policies across ticketing system tables.
-- Run this script in the Supabase SQL Editor.

-- ============================================================================
-- 1. Fix ORGANIZATIONS RLS Policies
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_read_policy ON organizations;
CREATE POLICY org_read_policy ON organizations
    FOR SELECT TO authenticated
    USING (
        public.is_manager_or_admin() OR
        id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS org_insert_policy ON organizations;
CREATE POLICY org_insert_policy ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_manager_or_admin()
    );

DROP POLICY IF EXISTS org_update_policy ON organizations;
CREATE POLICY org_update_policy ON organizations
    FOR UPDATE TO authenticated
    USING (
        public.is_manager_or_admin()
    );

DROP POLICY IF EXISTS org_delete_policy ON organizations;
CREATE POLICY org_delete_policy ON organizations
    FOR DELETE TO authenticated
    USING (
        public.is_manager_or_admin()
    );

-- ============================================================================
-- 2. Fix CUSTOMER_CONTRACTS RLS Policies
-- ============================================================================
ALTER TABLE customer_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contracts_select_policy ON customer_contracts;
CREATE POLICY contracts_select_policy ON customer_contracts
    FOR SELECT TO authenticated
    USING (
        public.is_manager_or_admin() OR
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS contracts_insert_policy ON customer_contracts;
CREATE POLICY contracts_insert_policy ON customer_contracts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_manager_or_admin()
    );

DROP POLICY IF EXISTS contracts_update_policy ON customer_contracts;
CREATE POLICY contracts_update_policy ON customer_contracts
    FOR UPDATE TO authenticated
    USING (
        public.is_manager_or_admin()
    );

DROP POLICY IF EXISTS contracts_delete_policy ON customer_contracts;
CREATE POLICY contracts_delete_policy ON customer_contracts
    FOR DELETE TO authenticated
    USING (
        public.is_manager_or_admin()
    );

-- ============================================================================
-- 3. Fix KNOWLEDGEBASE_ARTICLES RLS Policies
-- ============================================================================
ALTER TABLE knowledgebase_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_select_policy ON knowledgebase_articles;
CREATE POLICY kb_select_policy ON knowledgebase_articles
    FOR SELECT TO authenticated
    USING (
        (NOT is_internal) OR
        ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager', 'Consultant'))
    );

DROP POLICY IF EXISTS kb_write_policy ON knowledgebase_articles;
CREATE POLICY kb_write_policy ON knowledgebase_articles
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin()
    )
    WITH CHECK (
        public.is_manager_or_admin()
    );

-- ============================================================================
-- 4. Fix NOTIFICATIONS RLS Policies
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_access_policy ON notifications;
CREATE POLICY notifications_access_policy ON notifications
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- ============================================================================
-- 5. Fix SATISFACTION_RATINGS RLS Policies
-- ============================================================================
ALTER TABLE satisfaction_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csat_select_policy ON satisfaction_ratings;
CREATE POLICY csat_select_policy ON satisfaction_ratings
    FOR SELECT TO authenticated
    USING (
        public.is_manager_or_admin() OR
        ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

DROP POLICY IF EXISTS csat_insert_policy ON satisfaction_ratings;
CREATE POLICY csat_insert_policy ON satisfaction_ratings
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_manager_or_admin() OR
        ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

-- ============================================================================
-- 6. Fix TICKET_EFFORTS RLS Policies
-- ============================================================================
ALTER TABLE ticket_efforts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_efforts_access_policy ON ticket_efforts;
CREATE POLICY ticket_efforts_access_policy ON ticket_efforts
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        consultant_id = auth.uid()
    );
