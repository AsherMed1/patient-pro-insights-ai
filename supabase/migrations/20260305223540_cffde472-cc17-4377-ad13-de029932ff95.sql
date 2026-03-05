
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS short_notice_threshold_hours integer NOT NULL DEFAULT 72;

CREATE TABLE IF NOT EXISTS public.short_notice_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.all_appointments(id) ON DELETE CASCADE NOT NULL,
  project_name text NOT NULL,
  lead_name text NOT NULL,
  appointment_datetime timestamptz,
  created_datetime timestamptz,
  hours_difference numeric NOT NULL,
  alert_sent_at timestamptz DEFAULT now(),
  slack_sent boolean DEFAULT false,
  ghl_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.short_notice_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view short notice alerts"
  ON public.short_notice_alerts FOR SELECT TO authenticated USING (true);
