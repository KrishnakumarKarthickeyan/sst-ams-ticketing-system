-- =============================================================================
--  FORCE PASSWORD RESET — krishnakumar@isupportz.com & keerthana@isupportz.com
-- -----------------------------------------------------------------------------
--  Forces these two accounts to set a new password on their next login. It does
--  NOT change their current password value — it only raises the forced-reset gate,
--  which the app enforces in TWO places (both must be set):
--    • public.profiles.force_password_change          (read by AuthContext)
--    • auth.users user_metadata.force_password_change (read by middleware.ts —
--      this is what actually redirects them to the reset screen)
--  Run in the Supabase SQL editor (privileged; no Admin API needed). Emails are
--  matched case-insensitively. Safe to re-run (idempotent).
-- =============================================================================

-- ── PART A — PRE-CHECK (READ-ONLY): confirm both accounts exist ──────────────
SELECT 'PRE' AS phase, p.email, p.role,
       p.force_password_change AS profile_flag,
       COALESCE((u.raw_user_meta_data ->> 'force_password_change')::boolean, false) AS auth_flag
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
 WHERE lower(p.email) IN ('krishnakumar@isupportz.com', 'keerthana@isupportz.com')
 ORDER BY p.email;

-- ── PART B — SET THE FORCED-RESET GATE (both stores) ─────────────────────────
UPDATE public.profiles
   SET force_password_change = true
 WHERE lower(email) IN ('krishnakumar@isupportz.com', 'keerthana@isupportz.com');

UPDATE auth.users
   SET raw_user_meta_data =
         COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"force_password_change": true}'::jsonb
 WHERE lower(email) IN ('krishnakumar@isupportz.com', 'keerthana@isupportz.com');

-- ── PART C — POST-VERIFY (READ-ONLY): both flags must be true for both rows ───
SELECT 'POST' AS phase, p.email, p.role,
       p.force_password_change AS profile_flag,
       COALESCE((u.raw_user_meta_data ->> 'force_password_change')::boolean, false) AS auth_flag
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
 WHERE lower(p.email) IN ('krishnakumar@isupportz.com', 'keerthana@isupportz.com')
 ORDER BY p.email;
