-- RUN MANUALLY IN SUPABASE SQL EDITOR
-- Migration: 20260611000000_verify_manager_rls.sql
-- Goal: Ensure Managers and SuperAdmins have full CRUD permission on profiles and customer_contracts without RLS blocks

-- 1. Double check / Recreate is_manager_or_admin function to ensure it resolves true for Managers
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN (
        coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('SuperAdmin', 'Manager') OR
        coalesce(auth.jwt() ->> 'email', '') = 'manager@supportstudio.com' OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (select auth.uid()) 
            AND role IN ('SuperAdmin', 'Manager')
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Verify profiles table RLS policies
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy ON public.profiles 
FOR INSERT TO authenticated 
WITH CHECK (public.is_manager_or_admin());

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles 
FOR UPDATE TO authenticated 
USING (public.is_manager_or_admin() OR id = (select auth.uid()));

DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;
CREATE POLICY profiles_delete_policy ON public.profiles 
FOR DELETE TO authenticated 
USING (public.is_manager_or_admin());

-- 3. Verify customer_contracts table RLS policies
DROP POLICY IF EXISTS contracts_insert_policy ON public.customer_contracts;
CREATE POLICY contracts_insert_policy ON public.customer_contracts 
FOR INSERT TO authenticated 
WITH CHECK (public.is_manager_or_admin());

DROP POLICY IF EXISTS contracts_update_policy ON public.customer_contracts;
CREATE POLICY contracts_update_policy ON public.customer_contracts 
FOR UPDATE TO authenticated 
USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS contracts_delete_policy ON public.customer_contracts;
CREATE POLICY contracts_delete_policy ON public.customer_contracts 
FOR DELETE TO authenticated 
USING (public.is_manager_or_admin());
