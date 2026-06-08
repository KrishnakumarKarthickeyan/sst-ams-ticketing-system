-- Create password_change_requests table
CREATE TABLE IF NOT EXISTS public.password_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_email VARCHAR NOT NULL,
  requester_name VARCHAR NOT NULL,
  organization VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR
);

-- Enable RLS
ALTER TABLE public.password_change_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can insert their own requests
CREATE POLICY "Users can insert their own password change requests" ON public.password_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Customers can view their own requests
CREATE POLICY "Users can view their own password change requests" ON public.password_change_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins and Managers can read all requests
CREATE POLICY "Admins/Managers can view all password change requests" ON public.password_change_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );

-- Policy: Admins and Managers can update requests
CREATE POLICY "Admins/Managers can update password change requests" ON public.password_change_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );
