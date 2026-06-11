-- Run this in your Supabase SQL Editor to fix the satisfaction ratings RLS error.

DROP POLICY IF EXISTS csat_insert_policy ON public.satisfaction_ratings;

CREATE POLICY csat_insert_policy ON public.satisfaction_ratings
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_manager_or_admin() OR
        ticket_id IN (
            SELECT id FROM public.tickets 
            WHERE organization_id = (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );
