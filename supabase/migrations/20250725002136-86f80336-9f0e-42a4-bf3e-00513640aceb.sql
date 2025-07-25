-- Update RLS policies to allow public read access to dashboard tables

-- Allow public read access to all_calls
CREATE POLICY "Public read all_calls" 
ON public.all_calls 
FOR SELECT 
USING (true);

-- Allow public read access to all_appointments  
CREATE POLICY "Public read all_appointments"
ON public.all_appointments
FOR SELECT
USING (true);

-- Allow public read access to agents
CREATE POLICY "Public read agents"
ON public.agents
FOR SELECT  
USING (true);

-- Allow public read access to projects
CREATE POLICY "Public read projects"
ON public.projects
FOR SELECT
USING (true);

-- Allow public read access to speed_to_lead_stats
CREATE POLICY "Public read speed_to_lead_stats"
ON public.speed_to_lead_stats
FOR SELECT
USING (true);