-- Make the files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'files';

-- Drop the public access policy if it exists
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Public files are viewable" ON storage.objects;