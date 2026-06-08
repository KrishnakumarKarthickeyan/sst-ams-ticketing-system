-- Create ticket_reopen_requests table
CREATE TABLE IF NOT EXISTS public.ticket_reopen_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  requester_name VARCHAR NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR,
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.ticket_reopen_requests ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Admins/Managers can view all, Customers can view if they own the ticket
CREATE POLICY "Read reopen requests based on role and organization" ON public.ticket_reopen_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    ) OR EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = ticket_reopen_requests.ticket_id
      AND t.organization_id = p.organization_id
    )
  );

-- INSERT policy: Customers can insert if they own the ticket
CREATE POLICY "Users can insert reopen requests for their own tickets" ON public.ticket_reopen_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = ticket_reopen_requests.ticket_id
      AND t.organization_id = p.organization_id
    )
  );

-- UPDATE policy: Admins/Managers can update
CREATE POLICY "Admins/Managers can update reopen requests" ON public.ticket_reopen_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SuperAdmin', 'Manager')
    )
  );
