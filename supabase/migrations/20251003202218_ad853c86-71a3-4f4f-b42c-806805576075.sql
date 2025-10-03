-- Consolidate duplicate "Premier Vascular" projects and normalize all project names
-- Step 1: Update any references to "Premier Vascular " → "Premier Vascular" (without trailing space)
UPDATE public.all_appointments
SET project_name = 'Premier Vascular'
WHERE project_name = 'Premier Vascular ';

UPDATE public.new_leads
SET project_name = 'Premier Vascular'
WHERE project_name = 'Premier Vascular ';

UPDATE public.all_calls
SET project_name = 'Premier Vascular'
WHERE project_name = 'Premier Vascular ';

UPDATE public.facebook_ad_spend
SET project_name = 'Premier Vascular'
WHERE project_name = 'Premier Vascular ';

-- Step 2: Delete the duplicate project entry (with trailing space)
DELETE FROM public.projects
WHERE project_name = 'Premier Vascular ';

-- Step 3: Create the normalization trigger function
CREATE OR REPLACE FUNCTION public.normalize_project_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_name IS NOT NULL THEN
    NEW.project_name := btrim(NEW.project_name);
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Apply the trigger to all_appointments
DROP TRIGGER IF EXISTS trg_normalize_project_name_all_appointments ON public.all_appointments;
CREATE TRIGGER trg_normalize_project_name_all_appointments
BEFORE INSERT OR UPDATE ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.normalize_project_name();

-- Step 5: Apply the trigger to projects
DROP TRIGGER IF EXISTS trg_normalize_project_name_projects ON public.projects;
CREATE TRIGGER trg_normalize_project_name_projects
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.normalize_project_name();

-- Step 6: One-time cleanup for all other tables
UPDATE public.projects
SET project_name = btrim(project_name)
WHERE project_name IS NOT NULL
  AND project_name <> btrim(project_name);

UPDATE public.all_appointments
SET project_name = btrim(project_name)
WHERE project_name IS NOT NULL
  AND project_name <> btrim(project_name);

UPDATE public.new_leads
SET project_name = btrim(project_name)
WHERE project_name IS NOT NULL
  AND project_name <> btrim(project_name);

UPDATE public.all_calls
SET project_name = btrim(project_name)
WHERE project_name IS NOT NULL
  AND project_name <> btrim(project_name);

UPDATE public.facebook_ad_spend
SET project_name = btrim(project_name)
WHERE project_name IS NOT NULL
  AND project_name <> btrim(project_name);