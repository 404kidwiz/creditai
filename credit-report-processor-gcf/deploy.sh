#!/bin/bash

# Deployment script for Credit Report Processor Google Cloud Function
# Make sure to replace the placeholder values with your actual configuration

# Configuration variables - UPDATE THESE
PROJECT_ID="creditai-123456"  # Replace with your actual GCP project ID
FUNCTION_NAME="process-credit-report"
REGION="us-central1"
SERVICE_ACCOUNT_EMAIL="creditai-gcf@creditai-123456.iam.gserviceaccount.com"  # Replace with your service account

# Environment variables - UPDATE THESE
SUPABASE_URL="https://uzugywvurvizopbkotgm.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6dWd5d3Z1cnZpem9wYmtvdGdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2MTA2NCwiZXhwIjoyMDY3NDM3MDY0fQ.EzFJyjfH69JuBi9t8K8UXPvBHYM1AO6gsaSIh3kHwoI"
GEMINI_API_KEY="your_gemini_api_key"  # Replace with your actual Gemini API key

# Deploy the function
echo "Deploying Google Cloud Function: $FUNCTION_NAME"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

gcloud functions deploy $FUNCTION_NAME \
  --runtime python311 \
  --trigger-http \
  --entry-point process_credit_report \
  --allow-unauthenticated \
  --region $REGION \
  --project $PROJECT_ID \
  --timeout 540s \
  --memory 1GB \
  --set-env-vars SUPABASE_URL="$SUPABASE_URL",SUPABASE_KEY="$SUPABASE_KEY",GEMINI_API_KEY="$GEMINI_API_KEY" \
  --service-account $SERVICE_ACCOUNT_EMAIL

echo "Deployment complete!"
echo "Function URL will be displayed above."
echo ""
echo "To test the function, use:"
echo "curl -X POST -H \"Content-Type: application/json\" \\"
echo "-d '{\"pdf_url\": \"https://your-pdf-url.com/sample.pdf\", \"user_id\": \"test-user-123\"}' \\"
echo "https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" 