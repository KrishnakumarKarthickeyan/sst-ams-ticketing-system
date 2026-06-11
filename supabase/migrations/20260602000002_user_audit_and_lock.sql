-- Migration: Add audit logging and lockout support
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for reading audit logs: Only SuperAdmin and Manager can view audit logs
CREATE POLICY "Allow admins and managers to select audit_logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('SuperAdmin', 'Manager')
    )
);

-- Policy for inserting audit logs: Users can insert audit logs if authenticated or via service role
CREATE POLICY "Allow authenticated to insert audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
