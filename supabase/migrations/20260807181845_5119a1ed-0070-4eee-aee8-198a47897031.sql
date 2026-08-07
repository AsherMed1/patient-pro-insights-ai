CREATE OR REPLACE FUNCTION public.get_mentionable_users()
RETURNS TABLE (id uuid, full_name text, email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.id)
    p.id,
    p.full_name,
    p.email,
    ur.role::text
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('admin','agent','qa_specialist','va')
  ORDER BY p.id, CASE ur.role::text
    WHEN 'admin' THEN 1
    WHEN 'agent' THEN 2
    WHEN 'qa_specialist' THEN 3
    ELSE 4 END;
$$;

REVOKE ALL ON FUNCTION public.get_mentionable_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_mentionable_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_mentionable_users() TO authenticated;