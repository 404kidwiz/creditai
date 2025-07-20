# Google Cloud Function Setup Guide for CreditAI

This guide will help you set up and deploy the Google Cloud Function for credit report processing in your CreditAI project.

## 🚀 Quick Start

### 1. Prerequisites

- Google Cloud Platform account
- Google Cloud SDK installed (`gcloud`)
- Python 3.8+ installed
- Supabase project (already configured)
- Google Gemini API key

### 2. One-Click Setup

```bash
# Navigate to the function directory
cd credit-report-processor-gcf

# Run the automated setup
./setup.sh
```

The setup script will guide you through all configuration steps.

## 📋 Manual Setup (Alternative)

### Step 1: Google Cloud Project Setup

#### Create a New Project
```bash
gcloud projects create creditai-123456 --name="CreditAI"
gcloud config set project creditai-123456
```

#### Enable Required APIs
```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable vision.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

#### Create Service Account
```bash
gcloud iam service-accounts create creditai-gcf \
    --display-name="CreditAI Google Cloud Function"

gcloud projects add-iam-policy-binding creditai-123456 \
    --member="serviceAccount:creditai-gcf@creditai-123456.iam.gserviceaccount.com" \
    --role="roles/cloudfunctions.developer"

gcloud projects add-iam-policy-binding creditai-123456 \
    --member="serviceAccount:creditai-gcf@creditai-123456.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding creditai-123456 \
    --member="serviceAccount:creditai-gcf@creditai-123456.iam.gserviceaccount.com" \
    --role="roles/cloudvision.user"
```

#### Download Service Account Key
```bash
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=creditai-gcf@creditai-123456.iam.gserviceaccount.com
```

### Step 2: Environment Configuration

#### Create Environment File
```bash
cd credit-report-processor-gcf
```

Create `.env` file:
```env
GOOGLE_APPLICATION_CREDENTIALS="service-account-key.json"
GEMINI_API_KEY="your_gemini_api_key"
SUPABASE_URL="https://uzugywvurvizopbkotgm.supabase.co"
SUPABASE_KEY="your_supabase_service_role_key"
```

#### Update Deployment Script
Edit `deploy.sh` with your actual values:
```bash
PROJECT_ID="creditai-123456"  # Your actual project ID
FUNCTION_NAME="process-credit-report"
REGION="us-central1"
SERVICE_ACCOUNT_EMAIL="creditai-gcf@creditai-123456.iam.gserviceaccount.com"
SUPABASE_URL="https://uzugywvurvizopbkotgm.supabase.co"
SUPABASE_KEY="your_actual_supabase_service_role_key"
GEMINI_API_KEY="your_actual_gemini_api_key"
```

### Step 3: Database Setup

#### Apply Supabase Schema
```bash
# Connect to your Supabase project
supabase link --project-ref uzugywvurvizopbkotgm

# Apply the schema
psql "postgresql://postgres:[YOUR-PASSWORD]@db.uzugywvurvizopbkotgm.supabase.co:5432/postgres" -f supabase_schema.sql
```

Or use the Supabase dashboard to run the SQL from `supabase_schema.sql`.

### Step 4: Deploy the Function

```bash
# Make scripts executable
chmod +x *.sh

# Deploy the function
./deploy.sh
```

### Step 5: Test the Deployment

```bash
# Test the function
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "pdf_url": "https://example.com/test-credit-report.pdf",
    "user_id": "test-user-123"
  }' \
  https://us-central1-creditai-123456.cloudfunctions.net/process-credit-report
```

## 🔗 Frontend Integration

### Step 1: Update Environment Variables

Add to your `.env.local`:
```env
NEXT_PUBLIC_GCF_URL=https://us-central1-creditai-123456.cloudfunctions.net/process-credit-report
```

### Step 2: Use the Integration

The integration is already created at `src/lib/google-cloud/creditReportProcessor.ts`. You can use it in your components:

```typescript
import { EnhancedCreditReportProcessor } from '@/lib/google-cloud/creditReportProcessor';
import { supabase } from '@/lib/supabase/client';

// In your component
const processor = new EnhancedCreditReportProcessor(supabase);

// Process a credit report
const handleProcessReport = async (pdfUrl: string, userId: string) => {
  try {
    const result = await processor.processReport(pdfUrl, userId);
    console.log('Processing result:', result);
    
    // Get the analysis
    const analyses = await processor.getAnalyses(userId);
    console.log('Analyses:', analyses);
  } catch (error) {
    console.error('Error processing report:', error);
  }
};
```

### Step 3: Update Upload Component

Update your `CreditReportUpload.tsx` to use the Google Cloud Function:

```typescript
import { EnhancedCreditReportProcessor } from '@/lib/google-cloud/creditReportProcessor';
import { supabase } from '@/lib/supabase/client';

// In your component
const processor = new EnhancedCreditReportProcessor(supabase);

const processFile = async (file: File) => {
  try {
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('credit-reports')
      .upload(`${userId}/${Date.now()}-${file.name}`, file);

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('credit-reports')
      .getPublicUrl(uploadData.path);

    // Process with Google Cloud Function
    const result = await processor.processReport(publicUrl, userId);
    
    // Handle success
    console.log('Processing complete:', result);
    
  } catch (error) {
    console.error('Error processing file:', error);
  }
};
```

## 🧪 Testing

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GOOGLE_APPLICATION_CREDENTIALS="service-account-key.json"
export GEMINI_API_KEY="your_gemini_api_key"
export SUPABASE_URL="https://uzugywvurvizopbkotgm.supabase.co"
export SUPABASE_KEY="your_supabase_service_role_key"

# Run the function locally
functions-framework --target=process_credit_report --port=8080
```

### Test the Function

```bash
# Run the test script
python test_local.py
```

## 📊 Database Schema

The function creates these tables:

- `credit_reports_analysis`: Stores processed credit report data
- `credit_report_violation_summary`: View for violation summaries

### Key Fields

- `user_id`: Links to Supabase auth users
- `pdf_url`: Original PDF file URL
- `extracted_text`: Raw text from PDF
- `parsed_data`: Structured credit report data (JSONB)
- `violations`: Detected violations (JSONB)
- `dispute_letter`: Generated dispute letter
- `processed_at`: Processing timestamp

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase service role key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | Yes (local) |
| `NEXT_PUBLIC_GCF_URL` | Google Cloud Function URL | Yes (frontend) |

### Function Configuration

- **Runtime**: Python 3.11
- **Memory**: 1GB
- **Timeout**: 540 seconds (9 minutes)
- **Trigger**: HTTP
- **Authentication**: Unauthenticated (for now)

## 🚨 Security Considerations

1. **Service Account**: Use least-privilege service account
2. **API Keys**: Store securely in environment variables
3. **CORS**: Configure CORS for your domain
4. **Rate Limiting**: Implement rate limiting for production
5. **Authentication**: Add authentication for production use

## 📈 Monitoring

### View Logs

```bash
gcloud functions logs read process-credit-report --region=us-central1
```

### Set Up Monitoring

```bash
# Create log-based metrics
gcloud logging metrics create credit-report-processing \
  --description="Credit report processing metrics" \
  --log-filter='resource.type="cloud_function" AND resource.labels.function_name="process-credit-report"'
```

## 🔄 Updates and Maintenance

### Update Function

```bash
./deploy.sh
```

### Update Dependencies

```bash
# Update requirements.txt
pip freeze > requirements.txt

# Redeploy
./deploy.sh
```

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**: Check service account permissions
2. **API Not Enabled**: Enable required Google Cloud APIs
3. **Timeout**: Increase function timeout or optimize processing
4. **Memory Issues**: Increase function memory allocation
5. **Supabase Connection**: Verify Supabase credentials and network access

### Debug Mode

```bash
# Enable debug logging
gcloud functions deploy process-credit-report \
  --set-env-vars LOG_LEVEL=DEBUG \
  --region=us-central1
```

## 📚 Next Steps

1. **Deploy the function** using the setup script
2. **Test the integration** with your frontend
3. **Set up monitoring** and logging
4. **Configure CORS** for your domain
5. **Add authentication** for production use
6. **Implement rate limiting** for API protection

## 🎯 Integration Checklist

- [ ] Google Cloud project created
- [ ] Required APIs enabled
- [ ] Service account created and configured
- [ ] Environment variables set
- [ ] Database schema applied
- [ ] Function deployed
- [ ] Function tested
- [ ] Frontend integration implemented
- [ ] Environment variables added to Next.js
- [ ] Upload component updated
- [ ] Monitoring configured

## 📞 Support

If you encounter issues:

1. Check the logs: `gcloud functions logs read process-credit-report --region=us-central1`
2. Verify environment variables are set correctly
3. Ensure all APIs are enabled
4. Check service account permissions
5. Verify Supabase connection and schema

The Google Cloud Function is now ready to process credit reports with AI-powered analysis, violation detection, and automatic dispute letter generation! 