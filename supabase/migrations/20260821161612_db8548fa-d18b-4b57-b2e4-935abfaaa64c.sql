CREATE TABLE IF NOT EXISTS public.job_locks (
  job_name text PRIMARY KEY,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT ALL ON public.job_locks TO service_role;

ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages job locks"
ON public.job_locks FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.acquire_job_lock(_job_name text, _ttl_seconds int DEFAULT 900)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  INSERT INTO public.job_locks (job_name, locked_at, expires_at)
  VALUES (_job_name, now(), now() + make_interval(secs => _ttl_seconds))
  ON CONFLICT (job_name) DO UPDATE
    SET locked_at = now(),
        expires_at = now() + make_interval(secs => _ttl_seconds)
    WHERE public.job_locks.expires_at < now()
  RETURNING true INTO ok;

  RETURN COALESCE(ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_job_lock(_job_name text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.job_locks WHERE job_name = _job_name;
$$;

CREATE OR REPLACE FUNCTION public.find_stub_intake_appointments(
  _max_notes_length int DEFAULT 300,
  _days int DEFAULT 30,
  _limit int DEFAULT 50,
  _project_name text DEFAULT NULL
)
RETURNS TABLE (id uuid, lead_name text, project_name text, ghl_id text, notes_length int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id,
         a.lead_name,
         a.project_name,
         a.ghl_id,
         COALESCE(length(btrim(a.patient_intake_notes)), 0) AS notes_length
  FROM public.all_appointments a
  WHERE a.ghl_id IS NOT NULL
    AND a.is_superseded IS NOT TRUE
    AND a.created_at > now() - make_interval(days => _days)
    AND COALESCE(length(btrim(a.patient_intake_notes)), 0) < _max_notes_length
    AND (_project_name IS NULL OR a.project_name = _project_name)
  ORDER BY a.created_at DESC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.find_stub_intake_appointments(int, int, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_stub_intake_appointments(int, int, int, text) TO service_role;
REVOKE ALL ON FUNCTION public.acquire_job_lock(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_job_lock(text, int) TO service_role;
REVOKE ALL ON FUNCTION public.release_job_lock(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_job_lock(text) TO service_role;