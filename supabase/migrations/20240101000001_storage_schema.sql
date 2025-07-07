-- =============================================
-- CreditAI Storage Schema and RLS Policies
-- =============================================

-- Storage extension is already available in Supabase

-- =============================================
-- STORAGE BUCKET: credit-reports
-- =============================================

-- Note: Storage bucket and policies need to be created manually in the Supabase dashboard
-- Go to Storage > New bucket > Name: credit-reports, Private: true
-- Then set up RLS policies in the dashboard

-- =============================================
-- ANALYTICS TABLES
-- =============================================

-- Upload analytics table
CREATE TABLE IF NOT EXISTS public.upload_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_status TEXT NOT NULL CHECK (upload_status IN ('success', 'failed', 'processing')),
  ocr_status TEXT CHECK (ocr_status IN ('pending', 'processing', 'success', 'failed')),
  ocr_confidence DECIMAL(5,2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 100),
  processing_time_ms INTEGER,
  error_message TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- User behavior analytics table
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- =============================================
-- ANALYTICS INDEXES
-- =============================================

-- Upload analytics indexes
CREATE INDEX IF NOT EXISTS idx_upload_analytics_user_id ON public.upload_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_analytics_status ON public.upload_analytics(upload_status);
CREATE INDEX IF NOT EXISTS idx_upload_analytics_created_at ON public.upload_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_upload_analytics_file_type ON public.upload_analytics(file_type);

-- User analytics indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_user_analytics_session_id ON public.user_analytics(session_id);

-- =============================================
-- ANALYTICS RLS POLICIES
-- =============================================

-- Enable RLS on analytics tables
ALTER TABLE public.upload_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Upload analytics policies
CREATE POLICY "Users can view own upload analytics" ON public.upload_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload analytics" ON public.upload_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User analytics policies
CREATE POLICY "Users can view own user analytics" ON public.user_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user analytics" ON public.user_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to get upload success rate
CREATE OR REPLACE FUNCTION public.get_upload_success_rate(
  user_id_param UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_uploads BIGINT,
  successful_uploads BIGINT,
  success_rate DECIMAL(5,2),
  avg_processing_time_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_uploads,
    COUNT(*) FILTER (WHERE upload_status = 'success')::BIGINT as successful_uploads,
    ROUND(
      (COUNT(*) FILTER (WHERE upload_status = 'success')::DECIMAL / COUNT(*)) * 100, 
      2
    ) as success_rate,
    ROUND(AVG(processing_time_ms))::INTEGER as avg_processing_time_ms
  FROM public.upload_analytics
  WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
    AND (user_id_param IS NULL OR user_id = user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get OCR accuracy statistics
CREATE OR REPLACE FUNCTION public.get_ocr_accuracy_stats(
  user_id_param UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_ocr_attempts BIGINT,
  successful_ocr BIGINT,
  avg_confidence DECIMAL(5,2),
  high_confidence_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_ocr_attempts,
    COUNT(*) FILTER (WHERE ocr_status = 'success')::BIGINT as successful_ocr,
    ROUND(AVG(ocr_confidence), 2) as avg_confidence,
    ROUND(
      (COUNT(*) FILTER (WHERE ocr_confidence >= 80)::DECIMAL / COUNT(*)) * 100, 
      2
    ) as high_confidence_rate
  FROM public.upload_analytics
  WHERE ocr_status IS NOT NULL
    AND created_at >= NOW() - INTERVAL '1 day' * days_back
    AND (user_id_param IS NULL OR user_id = user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track user event
CREATE OR REPLACE FUNCTION public.track_user_event(
  event_type_param TEXT,
  event_data_param JSONB DEFAULT '{}',
  page_url_param TEXT DEFAULT NULL,
  session_id_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.user_analytics (
    user_id,
    event_type,
    event_data,
    page_url,
    user_agent,
    ip_address,
    session_id
  ) VALUES (
    auth.uid(),
    event_type_param,
    event_data_param,
    page_url_param,
    current_setting('request.headers')::json->>'user-agent',
    inet_client_addr(),
    session_id_param
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS FOR AUTOMATIC ANALYTICS
-- =============================================

-- Trigger function to automatically track document uploads
CREATE OR REPLACE FUNCTION public.track_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Track upload event
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
    NEW.file_name,
    NEW.file_size,
    NEW.file_type,
    'success',
    current_setting('request.headers')::json->>'user-agent',
    inet_client_addr()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on documents table
CREATE TRIGGER track_document_upload_trigger
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.track_document_upload();

-- =============================================
-- STORAGE WEBHOOKS (for future use)
-- =============================================

-- Function to handle storage events
CREATE OR REPLACE FUNCTION public.handle_storage_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log storage events for analytics
  INSERT INTO public.user_analytics (
    user_id,
    event_type,
    event_data,
    page_url
  ) VALUES (
    auth.uid(),
    'storage_' || TG_OP,
    jsonb_build_object(
      'bucket_id', NEW.bucket_id,
      'name', NEW.name,
      'size', NEW.metadata->>'size',
      'mime_type', NEW.metadata->>'mimetype'
    ),
    '/upload'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Storage triggers would be configured in Supabase dashboard
-- This is a placeholder for the function that would be called 