-- ============================================================================
-- Storage Bucket Setup for Web Platform
-- ============================================================================
-- Creates storage bucket and RLS policies for survey photos
-- ============================================================================

-- Create storage bucket for survey photos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-photos',
  'survey-photos',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can upload survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Web users can view survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Web users can upload survey photos" ON storage.objects;

-- Allow service role to upload (for Edge Function sync)
CREATE POLICY "Service role can upload survey photos"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'survey-photos');

-- Allow service role to read (for Edge Function sync)
CREATE POLICY "Service role can read survey photos"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'survey-photos');

-- Allow service role to delete
CREATE POLICY "Service role can delete survey photos"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'survey-photos');

-- Allow authenticated users to view photos
CREATE POLICY "Web users can view survey photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'survey-photos');

-- Allow authenticated users to upload (for manual uploads)
CREATE POLICY "Web users can upload survey photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'survey-photos'
  AND (storage.foldername(name))[1] = 'surveys'
);

-- ============================================================================
-- Completion Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Storage bucket setup completed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Bucket: survey-photos';
  RAISE NOTICE 'Max size: 10 MB per file';
  RAISE NOTICE 'Allowed types: JPEG, JPG, PNG';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies created for:';
  RAISE NOTICE '  • Service role (full access for sync)';
  RAISE NOTICE '  • Authenticated users (read access)';
END $$;
