DELETE FROM public.all_calls
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY ghl_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) as rn
    FROM public.all_calls
    WHERE ghl_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_all_calls_ghl_id_unique 
ON public.all_calls (ghl_id) 
WHERE ghl_id IS NOT NULL;