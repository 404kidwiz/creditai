# CreditAI Upload Fix Guide

## Quick Fix Steps

### 1. Check Current Status
```bash
npm run check-setup
```

### 2. Fix Upload Issues
```bash
npm run fix-upload
```

### 3. Manual Steps (if needed)

#### Start Docker
- **macOS**: `open -a Docker`
- **Windows**: Start Docker Desktop
- **Linux**: `sudo systemctl start docker`

#### Start Supabase
```bash
supabase start
```

#### Set up storage
```bash
npm run setup-storage
```

#### Check environment variables
```bash
cp .env.local.template .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Test Upload
Visit: http://localhost:3000/test-upload

## Common Issues & Solutions

### Docker Not Running
- **Error**: "Cannot connect to Docker daemon"
- **Fix**: Start Docker Desktop

### Supabase Not Started
- **Error**: "Failed to fetch" or "Network error"
- **Fix**: Run `supabase start`

### Missing Storage Bucket
- **Error**: "Bucket not found"
- **Fix**: Run `npm run setup-storage`

### Missing Environment Variables
- **Error**: "Missing SUPABASE_URL" or similar
- **Fix**: Copy `.env.local.template` to `.env.local` and fill in values

## Available Scripts

- `npm run check-setup` - Check if everything is configured
- `npm run diagnose-upload` - Diagnose upload-specific issues
- `npm run fix-upload` - Automated fix for common issues
- `npm run setup-storage` - Set up Supabase storage buckets
- `npm run setup-supabase` - Complete Supabase setup

## Testing Upload

After running the fix, test your upload at:
- http://localhost:3000/test-upload (basic upload test)
- http://localhost:3000/test-pdf-simple (PDF processing test)
- http://localhost:3000/upload (main upload page)
