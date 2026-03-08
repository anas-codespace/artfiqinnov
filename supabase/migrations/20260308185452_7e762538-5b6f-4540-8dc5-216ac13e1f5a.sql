
-- Create proper RLS policies for the 'files' storage bucket

-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Owner or founders can update files" ON storage.objects;
DROP POLICY IF EXISTS "Owner or founders can delete files" ON storage.objects;

-- SELECT: All authenticated users can view files in the 'files' bucket
CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'files');

-- INSERT: All authenticated users can upload files to the 'files' bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- UPDATE: Owner or founders can update files
CREATE POLICY "Owner or founders can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

-- DELETE: Owner or founders can delete files
CREATE POLICY "Owner or founders can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);
