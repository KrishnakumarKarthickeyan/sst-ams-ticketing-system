-- SQL Migration to fix Row Level Security (RLS) policies for Consultants and Managers
-- Execute this script in the Supabase SQL Editor.

-- ============================================================================
-- 1. Fix Organizations SELECT Policy
-- ============================================================================
DROP POLICY IF EXISTS org_read_policy ON public.organizations;
CREATE POLICY org_read_policy ON public.organizations
    FOR SELECT TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' OR
        id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- 2. Fix Customer Contracts SELECT Policy
-- ============================================================================
DROP POLICY IF EXISTS contracts_select_policy ON public.customer_contracts;
CREATE POLICY contracts_select_policy ON public.customer_contracts
    FOR SELECT TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' OR
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- 3. Fix Customer Contacts ALL Access Policy
-- ============================================================================
DROP POLICY IF EXISTS contacts_access_policy ON public.customer_contacts;
CREATE POLICY contacts_access_policy ON public.customer_contacts
    FOR ALL TO authenticated
    USING (
        public.is_manager_or_admin() OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' OR
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- 4. Fix Satisfaction Ratings (CSAT) INSERT Policy
-- ============================================================================
DROP POLICY IF EXISTS csat_insert_policy ON public.satisfaction_ratings;
CREATE POLICY csat_insert_policy ON public.satisfaction_ratings
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_manager_or_admin() OR
        ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );
