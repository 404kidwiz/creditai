# Credit Report Processor - Google Cloud Function

This Google Cloud Function processes credit reports using Google Cloud Vision AI for text extraction and Google Gemini for AI analysis. It detects FCRA violations and generates dispute letters automatically.

## 🚀 Features

- **PDF Text Extraction**: Uses Google Cloud Vision AI for accurate OCR
- **AI-Powered Analysis**: Leverages Google Gemini for intelligent credit report parsing
- **Violation Detection**: Automatically identifies FCRA and Metro 2 violations
- **Dispute Letter Generation**: Creates professional dispute letters based on violations
- **Supabase Integration**: Stores results in Supabase database with real-time updates
- **Scalable Architecture**: Serverless function that scales automatically

## 📋 Prerequisites

- Google Cloud Platform account
- Google Cloud SDK installed
- Python 3.8+ installed
- Supabase project set up
- Google Gemini API key

## 🛠️ Setup Instructions

### 1. Clone and Navigate to the Function Directory

```bash
cd credit-report-processor-gcf
```

### 2. Run the Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Check prerequisites
- Prompt for configuration details
- Create environment files
- Update deployment scripts

### 3. Manual Configuration (Alternative)

If you prefer manual setup:

#### Environment Variables

Create a `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
GEMINI_API_KEY="your_gemini_api_key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your_supabase_service_role_key"
```

#### Update deploy.sh

Edit `deploy.sh` with your actual values:

```bash
PROJECT_ID="your-gcp-project-id"
FUNCTION_NAME="process-credit-report"
REGION="us-central1"
SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your_supabase_service_role_key"
GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Set Up Google Cloud Project

#### Create a New Project (if needed)

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

### 5. Set Up Supabase Database

Run the database schema:

```bash
# Connect to your Supabase project
supabase link --project-ref your-project-ref

# Apply the schema
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase_schema.sql
```

Or use the Supabase dashboard to run the SQL from `supabase_schema.sql`.

## 🚀 Deployment

### Deploy the Function

```bash
chmod +x deploy.sh
./deploy.sh
```

### Verify Deployment

```bash
gcloud functions list --region=us-central1
```

## 🧪 Testing

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GOOGLE_APPLICATION_CREDENTIALS="service-account-key.json"
export GEMINI_API_KEY="your_gemini_api_key"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your_supabase_service_role_key"

# Run the function locally
functions-framework --target=process_credit_report --port=8080
```

### Test the Function

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "pdf_url": "https://your-pdf-url.com/sample.pdf",
    "user_id": "test-user-123"
  }' \
  http://localhost:8080
```

### Production Testing

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "pdf_url": "https://your-pdf-url.com/sample.pdf",
    "user_id": "test-user-123"
  }' \
  https://us-central1-creditai-123456.cloudfunctions.net/process-credit-report
```

## 🔗 Frontend Integration

### Install Dependencies

```bash
npm install @supabase/supabase-js
```

### Import and Use

```typescript
import { useCreditReportProcessor } from './credit-report-processor-gcf/frontend_integration';

// In your React component
const { processReport, getAnalyses } = useCreditReportProcessor(
  'https://us-central1-creditai-123456.cloudfunctions.net/process-credit-report',
  supabaseClient
);

// Process a credit report
const handleProcessReport = async (pdfUrl: string, userId: string) => {
  try {
    const result = await processReport(pdfUrl, userId);
    console.log('Processing result:', result);
  } catch (error) {
    console.error('Error processing report:', error);
  }
};
```

## 📊 Database Schema

The function creates and uses the following tables:

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

## 📈 Monitoring and Logging

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

## 📚 Additional Resources

- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [FCRA Compliance Guide](https://www.ftc.gov/legal-library/browse/rules/fair-credit-reporting-act)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 