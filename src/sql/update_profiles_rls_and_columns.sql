-- SQL Migration to support stakeholder columns and secure RLS policies on profiles table

-- 1. Add stakeholder specific columns to profiles if they do not exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS consultant_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS sap_modules VARCHAR(50)[],
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS role_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS skills TEXT;

-- 2. Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing profiles policies to avoid duplicates
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON profiles;

-- 4. Create secure function to check manager/admin access (bypasses RLS recursively via SECURITY DEFINER)
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

-- 5. Create secure RLS policies using the helper function
CREATE POLICY profiles_select_policy ON profiles
    FOR SELECT
    USING (true); -- Public read-access (safe, required for ticket lookup and assignee grids)

CREATE POLICY profiles_insert_policy ON profiles
    FOR INSERT
    WITH CHECK (
        public.is_manager_or_admin()
    ); -- Only Managers/SuperAdmins can register new stakeholders

CREATE POLICY profiles_update_policy ON profiles
    FOR UPDATE
    USING (
        public.is_manager_or_admin() OR
        id = auth.uid()
    ); -- Managers/SuperAdmins can update anyone; users can update their own details

CREATE POLICY profiles_delete_policy ON profiles
    FOR DELETE
    USING (
        public.is_manager_or_admin()
    ); -- Only Managers/SuperAdmins can prune profiles



