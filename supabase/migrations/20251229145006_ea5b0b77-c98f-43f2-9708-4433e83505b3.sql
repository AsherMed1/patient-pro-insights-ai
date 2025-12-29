-- Create storage bucket for help videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('help-videos', 'help-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Allow authenticated users to upload help videos
CREATE POLICY "Authenticated users can upload help videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'help-videos');

-- RLS policy: Allow public read access to help videos
CREATE POLICY "Public can view help videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'help-videos');

-- RLS policy: Allow authenticated users to delete help videos
CREATE POLICY "Authenticated users can delete help videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'help-videos');

-- RLS policy: Allow authenticated users to update help videos
CREATE POLICY "Authenticated users can update help videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'help-videos');