-- Create insurance-cards storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-cards', 'insurance-cards', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to insurance-cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'insurance-cards');

-- RLS policy: Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates to insurance-cards"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'insurance-cards');

-- RLS policy: Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes from insurance-cards"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'insurance-cards');

-- RLS policy: Allow public read access
CREATE POLICY "Allow public read from insurance-cards"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'insurance-cards');

-- Add column for back of card (front uses existing insurance_id_link)
ALTER TABLE all_appointments
ADD COLUMN IF NOT EXISTS insurance_back_link TEXT;