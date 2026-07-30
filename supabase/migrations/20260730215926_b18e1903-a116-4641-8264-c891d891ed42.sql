ALTER TABLE public.qa_cases ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE POLICY "Authenticated can upload qa ticket attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'qa-ticket-attachments');

CREATE POLICY "Authenticated can read qa ticket attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'qa-ticket-attachments');

CREATE POLICY "Authenticated can update qa ticket attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'qa-ticket-attachments');

CREATE POLICY "Authenticated can delete qa ticket attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'qa-ticket-attachments');