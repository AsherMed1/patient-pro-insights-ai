
-- Add branding and customization fields to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_logo_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#3B82F6';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_secondary_color text DEFAULT '#8B5CF6';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_insurance_list jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_doctors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_facility_info jsonb DEFAULT '{}'::jsonb;

-- Remove customization fields from project_forms table since they'll inherit from project
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS custom_logo_url;
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS brand_primary_color;
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS brand_secondary_color;
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS custom_insurance_list;
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS custom_doctors;
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS custom_facility_info;
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS form_customizations;
ALTER TABLE public.project_forms DROP COLUMN IF EXISTS is_template_locked;

-- Drop the form customization history table since we're moving to project-level customization
DROP TABLE IF EXISTS public.form_customization_history;
