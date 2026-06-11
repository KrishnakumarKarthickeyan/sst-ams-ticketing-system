-- MIGRATION: Security hardening — RLS scoping (2026-06-11 enterprise audit P0 items)
--
-- 1. profiles: stop cross-tenant reads. Customers see only themselves, their own
--    organization's users, and internal staff (Consultant/Manager/SuperAdmin).
--    Consultants and Managers/SuperAdmins keep full directory visibility.
-- 2. notifications: replace the wide-open INSERT (with check true) with a
--    SECURITY DEFINER RPC that validates the sender participates in the ticket
--    context. Direct INSERT stays open to Managers/SuperAdmins only.
-- 3. tickets: split the single FOR ALL policy into per-command policies.
--    DELETE becomes Manager/SuperAdmin-only; INSERT and UPDATE carry WITH CHECK
--    so rows cannot be created for or moved into another organization.
--    Multi-consultant access via ticket_consultant_efforts is preserved.
-- 4. ticket_attachments: drop the legacy broad policy so only the tight
--    role-scoped policies from 20260611000001 remain in effect.

-- ============================================================================
-- Helper functions (SECURITY DEFINER avoids RLS recursion on profiles)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_org() TO authenticated;

-- ============================================================================
-- 1. profiles SELECT scoping (was: USING (true))
-- ============================================================================
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;

CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO authenticated
USING (
  public.is_manager_or_admin()
  OR id = auth.uid()
  OR public.current_user_role() = 'Consultant'
  OR (
    public.current_user_role() = 'Customer'
    AND (
      (organization_id IS NOT NULL AND organization_id = public.current_user_org())
      OR role IN ('Consultant', 'Manager', 'SuperAdmin')
    )
  )
);

-- ============================================================================
-- 2. notifications INSERT hardening
-- ============================================================================
DROP POLICY IF EXISTS n_insert_all ON public.notifications;
DROP POLICY IF EXISTS n_insert_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_access_policy ON public.notifications;

CREATE POLICY n_insert_admin ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_admin());

-- RPC for non-privileged senders: only within a ticket they participate in.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id   UUID,
  p_title     TEXT,
  p_message   TEXT,
  p_ticket_id VARCHAR(50) DEFAULT NULL,
  p_type      TEXT DEFAULT 'system',
  p_link_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender  UUID := auth.uid();
  v_id      UUID;
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_manager_or_admin() THEN
    v_allowed := TRUE;
  ELSIF p_ticket_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND (
          t.assigned_consultant_id = v_sender
          OR t.requested_by = v_sender
          OR t.created_by_user = v_sender
          OR (
            t.organization_id IS NOT NULL
            AND t.organization_id = (SELECT organization_id FROM public.profiles WHERE id = v_sender)
          )
          OR EXISTS (
            SELECT 1 FROM public.ticket_consultant_efforts e
            WHERE e.ticket_id = t.id
              AND e.consultant_id = v_sender
              AND e.is_deleted = FALSE
          )
        )
    ) INTO v_allowed;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to create this notification';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, ticket_id, type, link_path)
  VALUES (p_user_id, p_title, p_message, p_ticket_id, COALESCE(p_type, 'system'), p_link_path)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, VARCHAR, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 3. tickets per-command policies (was: one FOR ALL policy)
-- ============================================================================
DROP POLICY IF EXISTS tickets_access_policy ON public.tickets;
DROP POLICY IF EXISTS tickets_select_policy ON public.tickets;
DROP POLICY IF EXISTS tickets_insert_policy ON public.tickets;
DROP POLICY IF EXISTS tickets_update_policy ON public.tickets;
DROP POLICY IF EXISTS tickets_delete_policy ON public.tickets;

CREATE POLICY tickets_select_policy ON public.tickets
FOR SELECT TO authenticated
USING (
  public.is_manager_or_admin()
  OR (public.current_user_role() = 'Consultant' AND (
    assigned_consultant_id = auth.uid()
    OR id IN (
      SELECT ticket_id FROM public.ticket_consultant_efforts
      WHERE consultant_id = auth.uid() AND is_deleted = FALSE
    )
  ))
  OR (public.current_user_role() = 'Customer'
    AND organization_id = public.current_user_org())
);

CREATE POLICY tickets_insert_policy ON public.tickets
FOR INSERT TO authenticated
WITH CHECK (
  public.is_manager_or_admin()
  OR (public.current_user_role() = 'Customer'
    AND organization_id = public.current_user_org())
);

CREATE POLICY tickets_update_policy ON public.tickets
FOR UPDATE TO authenticated
USING (
  public.is_manager_or_admin()
  OR (public.current_user_role() = 'Consultant' AND (
    assigned_consultant_id = auth.uid()
    OR id IN (
      SELECT ticket_id FROM public.ticket_consultant_efforts
      WHERE consultant_id = auth.uid() AND is_deleted = FALSE
    )
  ))
  OR (public.current_user_role() = 'Customer'
    AND organization_id = public.current_user_org())
)
WITH CHECK (
  public.is_manager_or_admin()
  OR (public.current_user_role() = 'Consultant' AND (
    assigned_consultant_id = auth.uid()
    OR id IN (
      SELECT ticket_id FROM public.ticket_consultant_efforts
      WHERE consultant_id = auth.uid() AND is_deleted = FALSE
    )
  ))
  OR (public.current_user_role() = 'Customer'
    AND organization_id = public.current_user_org())
);

CREATE POLICY tickets_delete_policy ON public.tickets
FOR DELETE TO authenticated
USING (public.is_manager_or_admin());

-- ============================================================================
-- 4. ticket_attachments: remove the legacy broad policy (kept tight policies
--    from 20260611000001_add_attachments_rls_policies.sql)
-- ============================================================================
DROP POLICY IF EXISTS attachments_access_policy ON public.ticket_attachments;
