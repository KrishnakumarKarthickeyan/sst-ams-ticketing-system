-- Migration: Add force_password_change column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
