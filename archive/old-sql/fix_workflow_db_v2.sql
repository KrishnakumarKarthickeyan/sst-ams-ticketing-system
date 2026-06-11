-- SQL Migration v2: Overhaul Ticket Assignment, Estimates, Actuals and Auto-Closure Workflow
-- Compatible with Supabase PostgreSQL

-- 1. Alter TICKETS Table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS primary_consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closure_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- 2. Alter TICKET_CLOSURE_REQUESTS Table
ALTER TABLE public.ticket_closure_requests ADD COLUMN IF NOT EXISTS primary_consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.ticket_closure_requests ADD COLUMN IF NOT EXISTS closure_remarks TEXT;
ALTER TABLE public.ticket_closure_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create TICKET_ASSIGNMENTS Table
CREATE TABLE IF NOT EXISTS public.ticket_assignments (
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultant_type VARCHAR(50) NOT NULL, -- 'Functional', 'Technical'
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (ticket_id, consultant_id)
);

-- 4. Create TICKET_ESTIMATES Table
CREATE TABLE IF NOT EXISTS public.ticket_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultant_type VARCHAR(50) NOT NULL,
    estimated_hours NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    remarks TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_ticket_consultant_estimate UNIQUE(ticket_id, consultant_id)
);

-- 5. Create TICKET_ACTUAL_HOURS Table
CREATE TABLE IF NOT EXISTS public.ticket_actual_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closure_request_id UUID NOT NULL REFERENCES public.ticket_closure_requests(id) ON DELETE CASCADE,
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultant_type VARCHAR(50) NOT NULL,
    actual_hours NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT unique_closure_consultant_actual UNIQUE(closure_request_id, consultant_id)
);

-- 6. Row Level Security (RLS) Configuration
ALTER TABLE public.ticket_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_actual_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assignments_select_policy ON public.ticket_assignments;
DROP POLICY IF EXISTS assignments_write_policy ON public.ticket_assignments;
DROP POLICY IF EXISTS estimates_select_policy ON public.ticket_estimates;
DROP POLICY IF EXISTS estimates_write_policy ON public.ticket_estimates;
DROP POLICY IF EXISTS actual_hours_select_policy ON public.ticket_actual_hours;
DROP POLICY IF EXISTS actual_hours_write_policy ON public.ticket_actual_hours;

-- A. Assignments policies
CREATE POLICY assignments_select_policy ON public.ticket_assignments 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY assignments_write_policy ON public.ticket_assignments 
    FOR ALL TO authenticated USING (public.is_manager_or_admin()) WITH CHECK (public.is_manager_or_admin());

-- B. Estimates policies (Internal only: Managers & Consultants)
CREATE POLICY estimates_select_policy ON public.ticket_estimates 
    FOR SELECT TO authenticated 
    USING (
        public.is_manager_or_admin() OR 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant'
    );

CREATE POLICY estimates_write_policy ON public.ticket_estimates 
    FOR ALL TO authenticated 
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND consultant_id = auth.uid()
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Consultant' AND consultant_id = auth.uid()
    );

-- C. Actual Hours policies (Read access to authenticated users, Write access to Primary Consultant or Manager)
CREATE POLICY actual_hours_select_policy ON public.ticket_actual_hours 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY actual_hours_write_policy ON public.ticket_actual_hours 
    FOR ALL TO authenticated 
    USING (
        public.is_manager_or_admin() OR 
        auth.uid() = (SELECT primary_consultant_id FROM public.tickets WHERE id = ticket_id)
    )
    WITH CHECK (
        public.is_manager_or_admin() OR 
        auth.uid() = (SELECT primary_consultant_id FROM public.tickets WHERE id = ticket_id)
    );

-- 7. Realtime Replication Additions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE 
                public.ticket_assignments,
                public.ticket_estimates,
                public.ticket_actual_hours;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- 8. Data Migration & Synchronization
-- A. Migrate existing efforts to assignments
INSERT INTO public.ticket_assignments (ticket_id, consultant_id, consultant_type, is_primary, active)
SELECT ticket_id, consultant_id, consultant_type, FALSE, TRUE
FROM public.ticket_consultant_efforts
ON CONFLICT (ticket_id, consultant_id) DO NOTHING;

-- B. Set primary consultant on tickets based on assigned_consultant_id
UPDATE public.tickets t
SET primary_consultant_id = t.assigned_consultant_id
WHERE t.assigned_consultant_id IS NOT NULL AND t.primary_consultant_id IS NULL;

-- C. Sync is_primary in assignments table
UPDATE public.ticket_assignments ta
SET is_primary = TRUE
FROM public.tickets t
WHERE ta.ticket_id = t.id AND ta.consultant_id = t.primary_consultant_id;

-- D. Migrate existing estimates
INSERT INTO public.ticket_estimates (ticket_id, consultant_id, consultant_type, estimated_hours, remarks)
SELECT ticket_id, consultant_id, consultant_type, estimated_hours, remarks
FROM public.ticket_consultant_efforts
WHERE estimated_hours > 0
ON CONFLICT (ticket_id, consultant_id) DO NOTHING;

-- E. Migrate existing actuals for approved closures
INSERT INTO public.ticket_actual_hours (closure_request_id, ticket_id, consultant_id, consultant_type, actual_hours)
SELECT cr.id, cr.ticket_id, tce.consultant_id, tce.consultant_type, tce.actual_hours
FROM public.ticket_closure_requests cr
JOIN public.ticket_consultant_efforts tce ON cr.ticket_id = tce.ticket_id
WHERE cr.status = 'Approved' AND tce.actual_hours > 0
ON CONFLICT DO NOTHING;
