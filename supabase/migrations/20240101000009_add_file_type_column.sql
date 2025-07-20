-- =============================================
-- Add missing file_type column to documents table
-- =============================================

-- Add file_type column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Add check constraint for file_type (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_file_type_check'
    ) THEN
        ALTER TABLE public.documents
        ADD CONSTRAINT documents_file_type_check
        CHECK (file_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    END IF;
END $$;

-- Create index for file_type
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);

-- Update existing records to have a default file_type based on file extension
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
WHERE file_type IS NULL;

-- Add NOT NULL constraint after updating existing records
ALTER TABLE public.documents 
ALTER COLUMN file_type SET NOT NULL;