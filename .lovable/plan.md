## Problem

As a `project_user` on Texas Vascular Institute, searching "hawkins" and switching tabs returns 500s. Postgres logs show repeated `canceling statement due to statement timeout` on `all_appointments`. The trigram indexes added in the previous migration aren't enough because the RLS policy forces an expensive per-row subquery before the search filter runs.

## Root cause

`all_appointments` has **two duplicate** SELECT policies for project users (`Project users see assigned project appointments` and `Project users view assigned appointments`). Each one runs:

```sql
EXISTS (SELECT 1 FROM project_user_access pua
        JOIN projects p ON pua.project_id = p.id
        WHERE pua.user_id = auth.uid()
          AND p.project_name = all_appointments.project_name)
```

PostgREST OR-combines permissive policies, so this join executes twice per candidate row. Combined with `lead_name ilike '%hawkins%'` and the count/HEAD queries the UI fires on tab switch, it blows past 8s.

## Fix

1. **Add a cached SECURITY DEFINER helper** `public.user_accessible_project_names(_user_id uuid)` that returns `text[]` of project names the user can see. Marked `STABLE` so Postgres memoizes it within a query.
2. **Drop the duplicate** SELECT policy (`Project users view assigned appointments`) and replace the remaining one with a version that uses `all_appointments.project_name = ANY(public.user_accessible_project_names(auth.uid()))`. This collapses the per-row join into a single array membership check.
3. **Add a supporting index** on `project_user_access(user_id)` if missing, so the helper itself is fast.
4. **Keep all other policies untouched** (admin/agent/va/review_only ALL+SELECT policies remain).

After this, the planner can use the existing `project_name`/trigram indexes first, and the RLS check becomes a constant-time array lookup instead of a join per row.

## Verification

- Re-run the failing query as a project_user (search "hawkins" on Texas Vascular Institute, switch to Completed and All tabs).
- Confirm no `canceling statement due to statement timeout` entries appear in `postgres_logs` for `all_appointments` after the change.
- Admin role behavior unchanged (admins still bypass via `has_role` short-circuit).

## Technical detail

```sql
-- Helper (security definer, stable)
CREATE OR REPLACE FUNCTION public.user_accessible_project_names(_user_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(p.project_name), ARRAY[]::text[])
  FROM public.project_user_access pua
  JOIN public.projects p ON p.id = pua.project_id
  WHERE pua.user_id = _user_id
$$;

-- Replace duplicate policies with one fast policy
DROP POLICY "Project users view assigned appointments" ON public.all_appointments;
DROP POLICY "Project users see assigned project appointments" ON public.all_appointments;

CREATE POLICY "Project users see assigned project appointments"
ON public.all_appointments FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR (
    has_role(auth.uid(), 'project_user'::app_role)
    AND project_name = ANY(public.user_accessible_project_names(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_project_user_access_user_id
  ON public.project_user_access(user_id);
```

No frontend changes required.