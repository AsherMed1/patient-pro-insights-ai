ALTER TABLE public.qa_cases REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'qa_cases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_cases;
  END IF;
END $$;