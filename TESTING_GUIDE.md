# CreditAI Testing Guide

This guide provides comprehensive instructions for testing your CreditAI setup, including credit report analysis diagnostics, PDF processing, Google Cloud integration, and authentication.

## Comprehensive Credit Analysis Testing

### 🧪 Credit Analysis Test Suite

We've created a comprehensive test suite to diagnose exactly where credit report analysis is failing and why inaccurate results are being returned.

**Quick Test Run:**
```bash
# Start your development server
npm run dev

# Run the comprehensive test suite
node test-credit-analysis.js

# For detailed output
node test-credit-analysis.js --verbose

# For JSON output (great for CI/CD)
node test-credit-analysis.js --json > test-results.json
```

**Or test via API directly:**
```bash
curl -X POST http://localhost:3000/api/test-credit-analysis
```

### What the Test Suite Covers

✅ **Environment Configuration**
- Google AI API key validation
- Server-side execution verification  
- Gemini model initialization testing

✅ **Sample Data Generation**
- Creates realistic credit report samples
- Tests with comprehensive credit data

✅ **Text Processing Validation** 
- Basic text parsing capabilities
- Regex pattern validation
- Data structure identification

✅ **AI Analysis Testing**
- Original CreditAnalyzer testing
- Multi-provider analyzer testing
- Confidence measurement
- Accuracy validation

✅ **API Endpoint Testing**
- Credit analysis API validation
- Error handling testing
- Response format verification

✅ **OCR Error Simulation**
- Tests robustness against OCR errors
- Character recognition mistake handling
- Noisy text processing

✅ **Edge Case Testing**
- Empty documents
- Short text handling
- Non-credit report content
- Malformed data processing

✅ **Performance Testing**
- Analysis speed measurement
- Consistency testing
- Bottleneck identification

### Understanding Test Results

**Confidence Scores:**
- 90-100%: Excellent analysis quality
- 70-89%: Good analysis quality  
- 50-69%: Fair quality, may need improvement
- Below 50%: Poor quality, requires attention

**Performance Benchmarks:**
- < 2 seconds: Excellent
- 2-5 seconds: Good
- 5-10 seconds: Fair
- > 10 seconds: Needs optimization

### Common Issues and Solutions

**🔑 Missing API Key**
```bash
# Add to .env.local
GOOGLE_AI_API_KEY=your_actual_api_key_here
```

**🤖 AI Model Failed**
- Verify API key is correct
- Check internet connectivity  
- Ensure server-side execution

**📊 Low Confidence Scores**
- Review AI prompts
- Improve text preprocessing
- Add validation logic

## Quick Start

1. **Check your setup**:
   ```bash
   npm run check-setup
   ```

2. **Run diagnostics**:
   ```bash
   node scripts/check-setup.js
   ```

3. **Test individual components**:
   - PDF Processing: http://localhost:3000/test-pdf-simple
   - Google Cloud: http://localhost:3000/test-google-cloud
   - Upload: http://localhost:3000/test-upload
   - Authentication: http://localhost:3000/test-auth

## Test Pages Overview

### 1. Simple PDF Test (`/test-pdf-simple`)
A minimal test page for PDF processing without complex UI components.

**Features:**
- Upload PDF files
- View processing results
- See extracted data
- Check processing method used

**Usage:**
1. Navigate to http://localhost:3000/test-pdf-simple
2. Upload a PDF credit report
3. Click "Process PDF"
4. Review the results

### 2. Google Cloud Test (`/test-google-cloud`)
Test Google Cloud services integration.

**Features:**
- Test Document AI processor
- Check service account authentication
- Validate Google Cloud configuration

### 3. Upload Test (`/test-upload`)
Test file upload functionality.

**Features:**
- Test file upload to Supabase Storage
- Check file validation
- Test different file types

### 4. Authentication Test (`/test-auth`)
Test user authentication flow.

**Features:**
- Test sign-in/sign-up
- Check session management
- Test protected routes

## Setup Verification

### Environment Variables
Run the setup checker to verify all required environment variables:

```bash
npm run check-setup
```

This will check:
- ✅ `.env.local` file exists
- ✅ All required environment variables are set
- ✅ Service account key file exists
- ✅ Dependencies are installed
- ✅ Test files are available

### Required Environment Variables
Make sure these are set in your `.env.local`:

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
GOOGLE_CLOUD_CREDENTIALS_JSON={"type":"service_account",...}

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Run `npm install` to install missing dependencies
   - Check if all required packages are in package.json

2. **Google Cloud authentication errors**
   - Verify service account key file exists
   - Check if GOOGLE_CLOUD_CREDENTIALS_JSON is valid JSON
   - Ensure the service account has Document AI permissions

3. **PDF processing fails**
   - Check if Document AI processor is created and enabled
   - Verify processor ID is correct
   - Check file size limits (max 20MB)

4. **Upload fails**
   - Check Supabase Storage bucket exists
   - Verify storage policies allow uploads
   - Check file type restrictions

### Debug Commands

```bash
# Check Google Cloud setup
npm run test-google-cloud

# Test service account
npm run test-service-account

# Check Google Cloud configuration
npm run test-gc-config

# Run comprehensive diagnostics
node scripts/check-setup.js
```

## Sample Test Data

### Test PDF Files
You can use these sample credit reports for testing:
- [Sample Equifax Report](https://example.com/sample-equifax.pdf)
- [Sample Experian Report](https://example.com/sample-experian.pdf)
- [Sample TransUnion Report](https://example.com/sample-transunion.pdf)

### Test Credit Report Structure
For testing purposes, you can create a simple PDF with:
- Personal information (name, address, SSN)
- Credit accounts (credit cards, loans)
- Payment history
- Credit inquiries
- Public records

## API Testing

### Test the PDF Processing API
```bash
curl -X POST http://localhost:3000/api/process-pdf \
  -F "file=@test-credit-report.pdf"
```

### Test the Upload API
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-document.pdf" \
  -F "userId=test-user"
```

## Development Workflow

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Run setup checks**:
   ```bash
   npm run check-setup
   ```

3. **Test PDF processing**:
   - Go to http://localhost:3000/test-pdf-simple
   - Upload a test PDF
   - Verify processing works

4. **Test authentication**:
   - Go to http://localhost:3000/test-auth
   - Test sign-up/sign-in flow

5. **Test upload**:
   - Go to http://localhost:3000/test-upload
   - Test file upload functionality

## Next Steps

After successful testing:

1. **Set up production environment**:
   - Configure production Google Cloud project
   - Set up production Supabase project
   - Configure custom domain

2. **Deploy to production**:
   - Deploy to Vercel, Netlify, or your preferred platform
   - Set up production environment variables
   - Test in production environment

3. **Monitor and maintain**:
   - Set up error tracking (Sentry, LogRocket)
   - Monitor API usage and costs
   - Set up alerts for failures

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run diagnostic scripts
3. Check the logs in your browser console
4. Review the Google Cloud Console for API errors
5. Check Supabase dashboard for storage issues

For additional help, refer to:
- [Google Cloud Setup Guide](GOOGLE_CLOUD_SETUP.md)
- [Storage Analytics Setup](STORAGE_ANALYTICS_SETUP.md)
- [AI Accuracy Guide](AI_ACCURACY_GUIDE.md)
