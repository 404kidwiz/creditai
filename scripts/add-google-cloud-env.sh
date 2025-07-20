#!/bin/bash

echo "🔧 Adding Google Cloud Environment Variables to .env.local"
echo "========================================================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    exit 1
fi

# Prompt for Document AI Processor ID
echo ""
echo "📄 Document AI Processor Setup:"
echo "1. Go to: https://console.cloud.google.com/ai/document-ai/processors?project=creditai-465215"
echo "2. Create a 'Document OCR' processor in 'us' location"
echo "3. Copy the Processor ID"
echo ""
read -p "Enter your Document AI Processor ID: " PROCESSOR_ID

# Prompt for Gemini API Key
echo ""
echo "🧠 Gemini AI API Key Setup:"
echo "1. Go to: https://makersuite.google.com/app/apikey"
echo "2. Create a new API key for project 'creditai-465215'"
echo "3. Copy the API key"
echo ""
read -p "Enter your Gemini API Key: " GEMINI_API_KEY

# Check if Google Cloud config already exists
if grep -q "GOOGLE_CLOUD_PROJECT_ID" .env.local; then
    echo ""
    echo "⚠️  Google Cloud configuration already exists in .env.local"
    read -p "Do you want to update it? (y/n): " UPDATE_CONFIG
    
    if [ "$UPDATE_CONFIG" != "y" ]; then
        echo "Cancelled."
        exit 0
    fi
    
    # Update existing values
    sed -i.bak "s/^GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=.*/GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=$PROCESSOR_ID/" .env.local
    sed -i.bak "s/^GOOGLE_AI_API_KEY=.*/GOOGLE_AI_API_KEY=$GEMINI_API_KEY/" .env.local
    
    echo "✅ Updated existing Google Cloud configuration"
else
    # Add new configuration
    echo "" >> .env.local
    echo "# =============================================" >> .env.local
    echo "# Google Cloud Configuration" >> .env.local
    echo "# =============================================" >> .env.local
    echo "GOOGLE_CLOUD_PROJECT_ID=creditai-465215" >> .env.local
    echo "GOOGLE_CLOUD_LOCATION=us" >> .env.local
    echo "GOOGLE_CLOUD_VISION_API_ENABLED=true" >> .env.local
    echo "GOOGLE_CLOUD_DOCUMENT_AI_ENABLED=true" >> .env.local
    echo "GOOGLE_CLOUD_CREDENTIALS_TYPE=service-account" >> .env.local
    echo "GOOGLE_CLOUD_KEY_FILE=google-cloud-key.json" >> .env.local
    echo "GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=$PROCESSOR_ID" >> .env.local
    echo "" >> .env.local
    echo "# Google AI (Gemini) Configuration" >> .env.local
    echo "GOOGLE_AI_API_KEY=$GEMINI_API_KEY" >> .env.local
    
    echo "✅ Added Google Cloud configuration to .env.local"
fi

echo ""
echo "🧪 Testing configuration..."
echo "Run this command to test: npm run test-google-cloud"
echo ""
echo "🎉 Setup complete! Your enhanced AI features are ready to use."
echo ""
echo "📚 Next steps:"
echo "1. Run: npm run test-google-cloud"
echo "2. Start server: npm run dev"
echo "3. Test at: http://localhost:3000/test-pdf-processing" 