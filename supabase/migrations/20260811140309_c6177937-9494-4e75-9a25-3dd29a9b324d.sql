ALTER TABLE public.appointment_notes ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.qa_ticket_events ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'qa_attachments_authenticated_read'
  ) THEN
    CREATE POLICY "qa_attachments_authenticated_read"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'qa-ticket-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'qa_attachments_authenticated_insert'
  ) THEN
    CREATE POLICY "qa_attachments_authenticated_insert"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'qa-ticket-attachments');
  END IF;
END $$;