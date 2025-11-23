-- Create storage bucket for survey photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-photos', 'survey-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload survey photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'survey-photos');

-- Allow authenticated users to view photos
CREATE POLICY "Authenticated users can view survey photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'survey-photos');

-- Allow users to delete their own survey photos
CREATE POLICY "Users can delete their own survey photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'survey-photos');

-- Allow public access to view photos (for published surveys)
CREATE POLICY "Public can view survey photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'survey-photos');
