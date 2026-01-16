-- Ensure authenticated users can read from the private 'files' storage bucket
-- This is required for generating signed URLs and downloading/previewing files.

DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;

CREATE POLICY "Authenticated users can view files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'files'
  AND auth.role() = 'authenticated'
);
