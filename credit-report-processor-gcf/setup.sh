#!/bin/bash

# Setup script for Credit Report Processor Google Cloud Function
# This script helps you configure the environment and deploy the function

echo "🚀 Credit Report Processor - Setup Script"
echo "=========================================="
echo ""

# Check if required tools are installed
echo "Checking prerequisites..."

# Check for gcloud
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check for python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or later."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Prompt for configuration
echo "📝 Configuration Setup"
echo "Please provide the following information:"
echo ""

read -p "Google Cloud Project ID: " PROJECT_ID
read -p "Google Cloud Region (default: us-central1): " REGION
REGION=${REGION:-us-central1}

read -p "Service Account Email: " SERVICE_ACCOUNT_EMAIL
read -p "Supabase URL (default: https://uzugywvurvizopbkotgm.supabase.co): " SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-https://uzugywvurvizopbkotgm.supabase.co}
read -s -p "Supabase Service Role Key: " SUPABASE_KEY
echo ""
read -s -p "Google Gemini API Key: " GEMINI_API_KEY
echo ""

# Create .env file for local testing
echo "📄 Creating .env file for local testing..."
cat > .env << EOL
# Environment variables for local testing
GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/google-cloud-service-account-key.json"
GEMINI_API_KEY="$GEMINI_API_KEY"
SUPABASE_URL="$SUPABASE_URL"
SUPABASE_KEY="$SUPABASE_KEY"
EOL

# Update deploy.sh with actual values
echo "🔧 Updating deployment script..."
sed -i.bak "s/creditai-123456/$PROJECT_ID/g" deploy.sh
sed -i.bak "s/us-central1/$REGION/g" deploy.sh
sed -i.bak "s/creditai-gcf@creditai-123456.iam.gserviceaccount.com/$SERVICE_ACCOUNT_EMAIL/g" deploy.sh
sed -i.bak "s|https://uzugywvurvizopbkotgm.supabase.co|$SUPABASE_URL|g" deploy.sh
sed -i.bak "s/your_supabase_service_role_key/$SUPABASE_KEY/g" deploy.sh
sed -i.bak "s/your_gemini_api_key/$GEMINI_API_KEY/g" deploy.sh

# Remove backup file
rm deploy.sh.bak

echo "✅ Configuration complete!"
echo ""

# Ask if user wants to deploy now
read -p "Would you like to deploy the function now? (y/N): " DEPLOY_NOW

if [[ $DEPLOY_NOW =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying Google Cloud Function..."
    chmod +x deploy.sh
    ./deploy.sh
else
    echo "📋 Setup complete! You can deploy later by running:"
    echo "   chmod +x deploy.sh"
    echo "   ./deploy.sh"
fi

echo ""
echo "📚 Next Steps:"
echo "1. Set up Supabase database schema using supabase_schema.sql"
echo "2. Configure Supabase Storage webhooks (see WEBHOOK_SETUP.md)"
echo "3. Test the function using test_local.py"
echo "4. Integrate with your frontend using frontend_integration.ts"
echo ""
echo "📖 For detailed instructions, see README.md"
echo "🔗 For webhook setup, see WEBHOOK_SETUP.md" 