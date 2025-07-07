# CreditAI Storage & Analytics Setup Guide

This guide covers the complete setup of Supabase Storage, Row Level Security (RLS) policies, OCR optimization, and analytics tracking for the CreditAI credit repair application.

## 🚀 Quick Start

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Run the setup script**:
   ```bash
   node scripts/setup-storage.js
   ```

3. **Test the system**:
   ```bash
   npm run dev
   # Visit http://localhost:3000/test-upload
   ```

## 📦 Storage Configuration

### Bucket Setup

The `credit-reports` bucket is configured with:

- **Privacy**: Private (not public)
- **File Size Limit**: 50MB
- **Allowed MIME Types**:
  - `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `text/plain`

### File Organization

Files are organized by user ID:
```
credit-reports/
├── user-id-1/
│   ├── 1703123456789.jpg
│   ├── 1703123456790.pdf
│   └── ...
├── user-id-2/
│   └── ...
```

### RLS Policies

The following Row Level Security policies ensure users can only access their own files:

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'credit-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own files
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'credit-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'credit-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'credit-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 🔍 OCR Optimization

### Enhanced Parameters

The OCR system has been optimized with the following parameters for better credit report recognition:

```javascript
await this.worker.setParameters({
  // Character whitelist optimized for credit reports
  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$%()-/:\\s',
  
  // Page segmentation mode for mixed text
  tessedit_pageseg_mode: Tesseract.PSM.AUTO,
  
  // Preserve interword spaces for better parsing
  preserve_interword_spaces: '1',
  
  // OCR Engine mode for better accuracy
  tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
  
  // Language model for better text recognition
  tessedit_do_invert: '0',
  
  // Text orientation detection
  textord_orientation: '0',
  
  // Line finding parameters
  textord_min_linesize: '1.5',
  
  // Word recognition parameters
  textord_min_xheight: '8',
  
  // Noise reduction
  textord_noise_debug: '0',
  textord_noise_normratio: '2.0',
  
  // Character recognition parameters
  tessedit_char_blacklist: '|\\/',
  
  // Confidence threshold
  tessedit_min_confidence: '30'
})
```

### Performance Improvements

- **Retry Logic**: Automatic retry on OCR failures
- **Progress Tracking**: Real-time progress updates
- **Processing Time**: Performance monitoring
- **Error Handling**: Comprehensive error tracking

## 📊 Analytics System

### Analytics Tables

#### Upload Analytics (`upload_analytics`)
Tracks file upload performance and OCR results:

```sql
CREATE TABLE upload_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

#### User Analytics (`user_analytics`)
Tracks user behavior and engagement:

```sql
CREATE TABLE user_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Analytics Functions

#### Upload Success Rate
```sql
SELECT * FROM get_upload_success_rate(user_id_param := NULL, days_back := 30);
```

#### OCR Accuracy Statistics
```sql
SELECT * FROM get_ocr_accuracy_stats(user_id_param := NULL, days_back := 30);
```

#### Track User Event
```sql
SELECT track_user_event(
  event_type_param := 'page_view',
  event_data_param := '{"page": "/upload"}',
  page_url_param := '/upload',
  session_id_param := 'session_123'
);
```

### Analytics Service

The `AnalyticsService` class provides methods for:

- **Event Tracking**: Track user actions and page views
- **Upload Analytics**: Monitor file upload success/failure rates
- **OCR Performance**: Track OCR accuracy and processing times
- **Error Tracking**: Monitor and analyze errors
- **Session Management**: Track user sessions

## 🧪 Testing

### Test Upload Page

Visit `http://localhost:3000/test-upload` to:

1. **Upload Sample Files**: Test with different file types and sizes
2. **View Analytics Dashboard**: Real-time performance metrics
3. **Monitor OCR Results**: Check confidence scores and extracted data
4. **Track Performance**: View processing times and success rates

### Sample Test Data

For testing, you can use:

- **High-quality images**: Clear, well-lit credit report photos
- **Low-quality images**: Blurry or poorly lit images to test robustness
- **Different formats**: JPG, PNG, PDF files
- **Various sizes**: Small to large files to test performance

### Analytics Dashboard

The test page includes:

- **Upload Success Rate**: Percentage of successful uploads
- **OCR Accuracy**: Percentage of successful OCR processing
- **Average Confidence**: Mean OCR confidence score
- **Processing Time**: Average time to process files
- **Detailed Statistics**: Breakdown by file type and user

## 🔧 Configuration

### Environment Variables

Add these to your `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_SESSION_TIMEOUT=3600000  # 1 hour in milliseconds

# OCR Configuration
OCR_MAX_RETRIES=2
OCR_CONFIDENCE_THRESHOLD=30
OCR_PROCESSING_TIMEOUT=30000  # 30 seconds

# Storage Configuration
STORAGE_MAX_FILE_SIZE=52428800  # 50MB
STORAGE_ALLOWED_TYPES=image/jpeg,image/png,image/jpg,application/pdf
```

### Performance Tuning

#### OCR Optimization
- Adjust `tessedit_min_confidence` for different accuracy requirements
- Modify `textord_min_linesize` for different document types
- Tune `textord_noise_normratio` for noisy images

#### Storage Optimization
- Configure CDN for faster file delivery
- Set appropriate cache headers
- Monitor storage usage and costs

#### Analytics Optimization
- Set up data retention policies
- Configure aggregation schedules
- Monitor query performance

## 📈 Monitoring

### Key Metrics to Track

1. **Upload Success Rate**: Should be >95%
2. **OCR Accuracy**: Should be >85%
3. **Average Processing Time**: Should be <10 seconds
4. **Error Rate**: Should be <5%
5. **User Engagement**: Track feature usage

### Alerts and Notifications

Set up alerts for:

- Upload failure rate >10%
- OCR accuracy <80%
- Processing time >30 seconds
- Storage usage >80%
- Error rate >5%

## 🔒 Security Considerations

### Data Protection

- All files are encrypted at rest
- RLS policies ensure data isolation
- User authentication required for all operations
- Audit logging for compliance

### Privacy Compliance

- GDPR-compliant data handling
- User consent for analytics tracking
- Data retention policies
- Right to data deletion

## 🚀 Production Deployment

### Supabase Production Setup

1. **Create Production Project**:
   ```bash
   supabase projects create creditai-prod
   ```

2. **Link to Production**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Deploy Schema**:
   ```bash
   supabase db push
   ```

4. **Configure Storage**:
   - Create `credit-reports` bucket in Supabase dashboard
   - Set bucket to private
   - Verify RLS policies are active

### Performance Optimization

1. **CDN Configuration**: Enable Supabase CDN for faster file delivery
2. **Database Indexing**: Monitor and optimize query performance
3. **Caching**: Implement appropriate caching strategies
4. **Monitoring**: Set up comprehensive monitoring and alerting

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Analytics Best Practices](https://supabase.com/docs/guides/analytics)

## 🆘 Troubleshooting

### Common Issues

1. **Upload Failures**:
   - Check file size limits
   - Verify file type restrictions
   - Ensure RLS policies are correct

2. **OCR Errors**:
   - Check image quality
   - Verify Tesseract installation
   - Monitor memory usage

3. **Analytics Issues**:
   - Check database permissions
   - Verify function definitions
   - Monitor query performance

### Support

For issues or questions:
- Check the [Supabase Community](https://github.com/supabase/supabase/discussions)
- Review the [CreditAI Issues](https://github.com/your-repo/creditai/issues)
- Contact the development team 