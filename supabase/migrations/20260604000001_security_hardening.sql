-- Migration: Hardening security, tracking failed login attempts and locking accounts.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;

-- Index for quick email-based lookup (used for checking lockout status prior to sign-in)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
