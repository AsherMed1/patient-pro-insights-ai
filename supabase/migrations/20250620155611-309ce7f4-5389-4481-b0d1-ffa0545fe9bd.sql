
-- Fix the hash_password function to have an immutable search_path
-- Ensure pgcrypto extension is available and properly configured
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.hash_password(text);

CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT crypt(password, gen_salt('bf'::text, 10));
$$;
