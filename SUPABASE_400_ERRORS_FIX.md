# Supabase 400 Errors Fix Report

## Investigation Summary

After thoroughly investigating the Supabase REST API 400 errors occurring after credit report upload, I identified several critical schema mismatches and malformed queries causing these issues.

## Root Causes Identified

### 1. **Database Function Schema Mismatches**

#### `insert_document` Function Issues:
- **Problem**: Function expected columns that don't exist in the `documents` table
- **Missing Columns**: `file_path`, `storage_provider`, `status`, `updated_at`
- **Impact**: 400 errors when calling `supabase.rpc('insert_document', ...)`

#### `track_document_upload` Function Issues:
- **Problem**: Function tried to insert into `upload_analytics` with non-existent columns
- **Missing Columns**: `document_id`, `processing_method`, `upload_timestamp`
- **Impact**: Analytics tracking failures causing secondary 400 errors

### 2. **Credit Reports Table Schema Issues**

#### Missing Columns in `credit_reports` Table:
- `user_hash`, `encrypted_data`, `encryption_iv`, `encryption_auth_tag`
- `processing_method`, `file_name`, `file_size`, `processing_time`
- `status`, `updated_at`, `extraction_metadata`, `validation_results`
- `quality_metrics`, `provider_detected`, `processing_time_ms`

#### Constraint Issues:
- `bureau` and `report_date` columns marked as NOT NULL but queries didn't always provide values
- Missing default values for required fields

### 3. **API Route Function Call Mismatches**

#### Documents API Route (`/api/documents/route.ts`):
- **Problem**: Called `insert_document` with parameters for OCR and AI analysis that the function didn't accept
- **Solution**: Created separate `insert_document_full` function for full document metadata

#### Upload API Route (`/api/upload/route.ts`):
- **Problem**: Function calls didn't handle errors properly, causing silent failures
- **Solution**: Added proper error handling and validation

### 4. **Missing Security Audit Table**

#### `security_audit_log` Table:
- **Problem**: `queries.ts` referenced non-existent `security_audit_log` table
- **Impact**: Security logging failures causing 400 errors
- **Solution**: Created missing table with proper schema

## Fixes Implemented

### 1. **Database Schema Fixes** (`/supabase/migrations/20240126000000_fix_400_errors.sql`)

#### Documents Table Updates:
```sql
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

#### Upload Analytics Table Updates:
```sql
ALTER TABLE upload_analytics 
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS processing_method TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

#### Credit Reports Table Updates:
```sql
ALTER TABLE credit_reports 
ADD COLUMN IF NOT EXISTS user_hash TEXT,
ADD COLUMN IF NOT EXISTS encrypted_data TEXT,
ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
ADD COLUMN IF NOT EXISTS encryption_auth_tag TEXT,
-- ... (additional columns as needed)
```

### 2. **Fixed Database Functions**

#### Updated `insert_document` Function:
- Now properly matches the documents table schema
- Handles all required columns with appropriate defaults
- Returns UUID for proper reference tracking

#### New `insert_document_full` Function:
- Specifically for documents API with OCR and AI analysis parameters
- Separates concerns between file upload and document processing

#### Fixed `track_document_upload` Function:
- Properly references documents table to get file metadata
- Inserts into upload_analytics with correct column mapping

### 3. **API Route Updates**

#### `/src/app/api/documents/route.ts`:
```typescript
// Changed from insert_document to insert_document_full
const { data, error } = await supabase.rpc('insert_document_full', {
  p_user_id: userId,
  p_document_type: documentType,
  p_file_url: fileUrl,
  p_file_name: fileName || 'unknown',
  p_file_size: fileSize || 0,
  p_ocr_text: ocrText || null,
  p_ai_analysis: aiAnalysis || null
})
```

#### `/src/app/api/upload/route.ts`:
- Added proper error handling and validation
- Return 400 errors with descriptive messages instead of silent failures
- Improved analytics tracking error handling

### 4. **Query Fixes** (`/src/lib/supabase/queries.ts`)

#### `storeCreditReportData` Function:
```typescript
// Added required bureau and report_date fields with defaults
const { data, error } = await supabase
  .from('credit_reports')
  .insert({
    // ... existing fields
    bureau: metadata.bureau || 'experian', // Default bureau
    report_date: metadata.reportDate || new Date().toISOString().split('T')[0], // Default to today
    // ... rest of fields
  })
```

### 5. **Security and RLS Policy Verification**

- Verified all RLS policies are properly configured
- Added missing `security_audit_log` table with appropriate policies
- Ensured function permissions are granted to authenticated users

## Files Modified

1. **Database Migration**: `/supabase/migrations/20240126000000_fix_400_errors.sql`
2. **API Routes**:
   - `/src/app/api/documents/route.ts`
   - `/src/app/api/upload/route.ts`
3. **Query Library**: `/src/lib/supabase/queries.ts`

## Expected Results

After applying these fixes:

1. **Upload API** (`/api/upload`) should no longer return 400 errors for valid file uploads
2. **Documents API** (`/api/documents`) should properly handle document creation with metadata
3. **Credit Report Processing** should successfully store encrypted data with proper metadata
4. **Analytics Tracking** should work without causing upload failures
5. **Security Logging** should function without throwing 400 errors

## Testing Recommendations

1. **Test File Upload Flow**:
   - Upload various file types (PDF, JPG, PNG)
   - Verify database records are created properly
   - Check analytics tracking works

2. **Test Document Processing**:
   - Submit documents with OCR and AI analysis data
   - Verify all metadata is stored correctly

3. **Test Credit Report Storage**:
   - Upload credit reports and verify encrypted storage
   - Check all metadata fields are populated

4. **Monitor Error Logs**:
   - Watch for any remaining 400 errors
   - Verify proper error messages are returned

## Migration Deployment

To deploy these fixes:

1. Apply the database migration:
   ```bash
   npx supabase db push
   ```

2. Deploy the updated API routes and queries
3. Test the upload functionality
4. Monitor logs for any remaining issues

## Prevention Measures

1. **Schema Validation**: Always validate database schema matches function expectations
2. **Type Safety**: Use proper TypeScript types that match database schema
3. **Error Handling**: Implement comprehensive error handling with descriptive messages
4. **Testing**: Add integration tests for database operations
5. **Migration Reviews**: Review all migrations to ensure they don't break existing functionality