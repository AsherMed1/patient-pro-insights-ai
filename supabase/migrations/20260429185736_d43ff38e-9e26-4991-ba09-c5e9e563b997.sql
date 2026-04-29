-- 1) Extend the role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'va';

-- 2) Add edit-tracking columns on appointment_notes
ALTER TABLE public.appointment_notes
  ADD COLUMN IF NOT EXISTS last_edited_by text,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;