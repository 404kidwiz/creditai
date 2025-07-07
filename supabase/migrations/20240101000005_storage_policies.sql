-- Create storage policies for the credit-reports bucket
-- Note: RLS is already enabled on storage.objects by default in Supabase

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Policy for uploading files to own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'credit-reports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for viewing own files  
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'credit-reports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for updating own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'credit-reports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for deleting own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'credit-reports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );