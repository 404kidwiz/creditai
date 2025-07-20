-- Temporarily drop the trigger that's causing the issue
DROP TRIGGER IF EXISTS track_document_upload_trigger ON public.documents;

-- Add the missing columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_file_name ON public.documents(file_name);

-- Recreate the trigger function with error handling
CREATE OR REPLACE FUNCTION public.track_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Track upload event with safe column access
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
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to track upload analytics: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER track_document_upload_trigger
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.track_document_upload();