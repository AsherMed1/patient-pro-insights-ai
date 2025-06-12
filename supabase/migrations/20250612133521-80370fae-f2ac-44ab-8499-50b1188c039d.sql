
-- Disable Row Level Security on the main data tables
ALTER TABLE public.new_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_spend DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_to_lead_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
