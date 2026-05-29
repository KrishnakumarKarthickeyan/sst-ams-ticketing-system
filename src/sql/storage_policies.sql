-- Storage RLS policies for the sap-tickets bucket
-- Execute this script in the Supabase SQL Editor.

-- 1. SELECT: Authenticated users can download files belonging to the sap-tickets bucket
DROP POLICY IF EXISTS "Allow authenticated select from sap-tickets" ON storage.objects;
CREATE POLICY "Allow authenticated select from sap-tickets" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'sap-tickets');

-- 2. INSERT: Authenticated users can upload files into the sap-tickets bucket
DROP POLICY IF EXISTS "Allow authenticated insert to sap-tickets" ON storage.objects;
CREATE POLICY "Allow authenticated insert to sap-tickets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'sap-tickets');

-- 3. UPDATE/DELETE: File owners, managers, and super admins can modify or delete files
DROP POLICY IF EXISTS "Allow owner or manager to update/delete on sap-tickets" ON storage.objects;
CREATE POLICY "Allow owner or manager to update/delete on sap-tickets" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id = 'sap-tickets' AND (
            auth.uid() = owner OR 
            (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager')
        )
    )
    WITH CHECK (
        bucket_id = 'sap-tickets' AND (
            auth.uid() = owner OR 
            (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Manager')
        )
    );
