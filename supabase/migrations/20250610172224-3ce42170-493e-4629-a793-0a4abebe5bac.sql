
-- Add branding and customization fields to project_forms table
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS custom_logo_url text;
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#3B82F6';
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS brand_secondary_color text DEFAULT '#8B5CF6';
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS custom_insurance_list jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS custom_doctors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS custom_facility_info jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS form_customizations jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.project_forms ADD COLUMN IF NOT EXISTS is_template_locked boolean DEFAULT false;

-- Create a table for form customizations history (optional - for tracking changes)
CREATE TABLE IF NOT EXISTS public.form_customization_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_form_id UUID NOT NULL REFERENCES public.project_forms(id) ON DELETE CASCADE,
  changes_made jsonb NOT NULL,
  changed_by text,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for the new table
ALTER TABLE public.form_customization_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert form customization history" 
  ON public.form_customization_history 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow select form customization history" 
  ON public.form_customization_history 
  FOR SELECT 
  USING (true);

-- Create a default insurance list for reference
INSERT INTO public.form_templates (id, form_type, title, description, total_steps, form_data)
VALUES (
  gen_random_uuid(),
  'insurance_reference',
  'Default Insurance Providers',
  'Reference list of common insurance providers',
  1,
  '{
    "insurance_providers": [
      {"value": "aetna", "label": "Aetna"},
      {"value": "anthem", "label": "Anthem Blue Cross Blue Shield"},
      {"value": "cigna", "label": "Cigna"},
      {"value": "humana", "label": "Humana"},
      {"value": "kaiser", "label": "Kaiser Permanente"},
      {"value": "medicare", "label": "Medicare"},
      {"value": "medicaid", "label": "Medicaid"},
      {"value": "united", "label": "UnitedHealthcare"},
      {"value": "bcbs", "label": "Blue Cross Blue Shield"},
      {"value": "tricare", "label": "TRICARE"},
      {"value": "molina", "label": "Molina Healthcare"},
      {"value": "centene", "label": "Centene"},
      {"value": "other", "label": "Other"}
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;
