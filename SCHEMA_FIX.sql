-- =============================================
-- FIX CREDITAI DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Drop the problematic trigger first
DROP TRIGGER IF EXISTS track_document_upload_trigger ON public.documents;

-- 2. Add missing columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);

-- 4. Add constraint for file_type (optional)
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_file_type_check;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_file_type_check 
CHECK (file_type IS NULL OR file_type IN (
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 
  'application/pdf', 'text/plain', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'application/vnd.ms-excel', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
));

-- 5. Fix the trigger function to handle missing columns gracefully
CREATE OR REPLACE FUNCTION public.track_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Track upload event with safe column access and error handling
  BEGIN
    INSERT INTO public.upload_analytics (
      user_id,
      file_name,
      file_size,
      file_type,
      upload_status,
      user_agent,
      ip_address
    ) VALUES (
      NEW.user_id,
      COALESCE(NEW.file_name, 'unknown'),
      COALESCE(NEW.file_size, 0),
      COALESCE(NEW.file_type, 'unknown'),
      'success',
      COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown'),
      COALESCE(inet_client_addr(), '0.0.0.0'::inet)
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the document insert
      RAISE WARNING 'Failed to track upload analytics: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate the trigger
CREATE TRIGGER track_document_upload_trigger
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.track_document_upload();

-- 7. Update existing records to have proper file_type based on file_name extension (optional)
UPDATE public.documents 
SET file_type = CASE 
  WHEN LOWER(file_name) LIKE '%.jpg' OR LOWER(file_name) LIKE '%.jpeg' THEN 'image/jpeg'
  WHEN LOWER(file_name) LIKE '%.png' THEN 'image/png'
  WHEN LOWER(file_name) LIKE '%.gif' THEN 'image/gif'
  WHEN LOWER(file_name) LIKE '%.webp' THEN 'image/webp'
  WHEN LOWER(file_name) LIKE '%.bmp' THEN 'image/bmp'
  WHEN LOWER(file_name) LIKE '%.pdf' THEN 'application/pdf'
  WHEN LOWER(file_name) LIKE '%.txt' THEN 'text/plain'
  WHEN LOWER(file_name) LIKE '%.doc' THEN 'application/msword'
  WHEN LOWER(file_name) LIKE '%.docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  WHEN LOWER(file_name) LIKE '%.xls' THEN 'application/vnd.ms-excel'
  WHEN LOWER(file_name) LIKE '%.xlsx' THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ELSE 'application/octet-stream'
END
WHERE file_type IS NULL AND file_name IS NOT NULL;

-- 8. Refresh the schema cache
NOTIFY pgrst, 'reload schema';