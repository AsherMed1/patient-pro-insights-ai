DROP INDEX IF EXISTS idx_all_calls_ghl_id_unique;
ALTER TABLE public.all_calls ADD CONSTRAINT all_calls_ghl_id_unique UNIQUE (ghl_id);