# CreditAI Setup Guide

## Environment Variables Setup

The upload functionality requires several environment variables to be configured. Create a `.env.local` file in the root directory with the following variables:

### Required for Basic Functionality

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI API (for credit analysis)
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Optional (for enhanced features)

```bash
# OpenAI API (alternative AI provider)
OPENAI_API_KEY=your_openai_api_key

# Analytics
GOOGLE_ANALYTICS_ID=your_ga_id
POSTHOG_API_KEY=your_posthog_key

# Email (for notifications)
SENDGRID_API_KEY=your_sendgrid_key
RESEND_API_KEY=your_resend_key

# SMS (for notifications)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

## Getting API Keys

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API
4. Copy the URL and anon key
5. Go to Settings > Service Role to get the service role key

### 2. Google AI API Setup
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key to your `.env.local` file

### 3. Supabase Storage Setup
1. In your Supabase dashboard, go to Storage
2. Create a new bucket called `credit-reports`
3. Set the bucket to private
4. Configure RLS policies (see below)

## Database Setup

Run the following commands to set up your database:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Start Supabase locally
supabase start

# Apply migrations
supabase db reset

# Create storage bucket
supabase storage create credit-reports
```

## Storage RLS Policies

Create the following RLS policies for the `credit-reports` bucket:

```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## Testing Upload Functionality

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/test-upload`

3. Click "Test Upload" to see detailed logs of the upload process

4. Check the browser console for additional debugging information

## Troubleshooting

### Upload Not Working
- Check that all required environment variables are set
- Verify Supabase storage bucket exists and has correct permissions
- Check browser console for error messages
- Use the test upload page to debug step by step

### AI Analysis Not Working
- Ensure Google AI API key is configured
- Check that the API key has proper permissions
- Verify the API quota hasn't been exceeded

### Database Errors
- Run `supabase db reset` to reset the database
- Check that all migrations have been applied
- Verify RLS policies are correctly configured

## Current Status

The app now includes fallback mechanisms for when AI analysis is not available, so uploads should work even without the Google AI API key. However, for full functionality, all environment variables should be configured. 