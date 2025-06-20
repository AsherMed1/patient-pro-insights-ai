
-- Fix the verify_password function to have an immutable search_path
-- First ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.verify_password(text, text);

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT crypt(password, hash) = hash;
$$;
