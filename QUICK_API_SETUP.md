# Quick API Setup Guide - Fix Inaccurate Results

## The Problem
Your CreditAI app is using placeholder API keys, causing AI analysis to fail and return inaccurate results.

## Quick Fix (5 minutes)

### 1. Get Google Gemini API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key" 
4. Copy the generated API key (starts with `AIza...`)

### 2. Update Environment File
1. Open `.env.local` in your project
2. Find the line: `GOOGLE_AI_API_KEY=YOUR_GEMINI_API_KEY_HERE`
3. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key

### 3. Restart Development Server
```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

## What This Fixes
- ✅ Accurate credit report analysis
- ✅ Proper credit score calculations  
- ✅ Intelligent dispute recommendations
- ✅ Detailed improvement insights

## Test It
1. Upload a credit report PDF
2. Check that you get detailed, accurate analysis instead of generic fallback text

## Optional: Better Document Processing

For even better accuracy, you can also set up Document AI:

1. Go to: https://console.cloud.google.com/ai/document-ai/processors
2. Create a "Document OCR" processor
3. Copy the Processor ID
4. Update `.env.local`: `GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id`

## Need Help?
- API Key Issues: Check the Google AI Studio console
- Processing Errors: Check browser console and terminal logs
- Still Getting Fallback Results: Restart your dev server after updating the API key