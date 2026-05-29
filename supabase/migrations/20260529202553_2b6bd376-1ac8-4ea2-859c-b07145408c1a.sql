-- Add 'review_only' role for pilot setters with Review Queue-only access
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'review_only';