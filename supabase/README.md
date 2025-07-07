# CreditAI Database Schema Documentation

## Overview

This directory contains the complete database schema for the CreditAI credit repair application. The schema is designed with security, performance, and scalability in mind, using Supabase as the backend database.

## Database Structure

### Core Tables

1. **profiles** - User profiles extending Supabase auth.users
2. **credit_reports** - Credit reports from different bureaus with AI analysis
3. **negative_items** - Negative items found in credit reports
4. **disputes** - Dispute cases for negative items
5. **documents** - User uploaded documents with OCR and AI analysis
6. **user_progress** - Gamification progress tracking

### Features

- ✅ **Row Level Security (RLS)** - Users can only access their own data
- ✅ **Automatic Timestamps** - `updated_at` fields auto-update via triggers
- ✅ **Performance Indexes** - Optimized for common query patterns
- ✅ **Data Validation** - Check constraints ensure data integrity
- ✅ **Foreign Key Relationships** - Proper referential integrity
- ✅ **Automatic Profile Creation** - Profiles created via triggers on user signup
- ✅ **Progress Tracking** - Automatic point updates on dispute resolution

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase Project

```bash
# Login to Supabase
supabase login

# Link to your project (or create new one)
supabase link --project-ref your-project-ref

# Or start local development
supabase start
```

### 3. Run Migrations

```bash
# Apply the database schema
supabase db push

# Or if using local development
supabase db reset
```

### 4. Environment Variables

Add these variables to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Schema Details

### Profiles Table

Extends Supabase's built-in authentication with credit repair specific fields.

```sql
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'basic', 'premium')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Credit Reports Table

Stores credit reports from different bureaus with AI analysis.

```sql
credit_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  bureau TEXT CHECK (bureau IN ('experian', 'equifax', 'transunion')),
  report_date DATE NOT NULL,
  score INTEGER CHECK (score >= 300 AND score <= 850),
  raw_data JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Negative Items Table

Tracks negative items found in credit reports that can be disputed.

```sql
negative_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  credit_report_id UUID REFERENCES credit_reports(id),
  creditor_name TEXT NOT NULL,
  account_number TEXT,
  balance DECIMAL(12,2),
  status TEXT CHECK (status IN ('identified', 'disputing', 'resolved', 'verified')),
  dispute_reason TEXT,
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Disputes Table

Manages dispute cases for negative items with tracking and bureau responses.

```sql
disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  negative_item_id UUID REFERENCES negative_items(id),
  dispute_reason TEXT NOT NULL,
  letter_content TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'investigating', 'resolved', 'rejected')),
  bureau_response TEXT,
  resolution_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Documents Table

Stores user uploaded documents with OCR and AI analysis capabilities.

```sql
documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  document_type TEXT CHECK (document_type IN ('identity', 'income', 'bank_statement', 'credit_report', 'dispute_letter', 'response_letter', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  ocr_text TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### User Progress Table

Gamification system with points, levels, and achievements.

```sql
user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  achievements JSONB DEFAULT '[]',
  streak_days INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Proper authentication is required for all operations
- No data leakage between users

### Sample RLS Policy

```sql
-- Users can only view their own credit reports
CREATE POLICY "Users can view their own credit reports" ON credit_reports
  FOR SELECT USING (auth.uid() = user_id);
```

### Automatic Profile Creation

When a user signs up through Supabase Auth, a profile and user progress record are automatically created:

```sql
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();
```

## Performance Optimizations

### Indexes

Strategic indexes are created for common query patterns:

```sql
-- Credit reports indexes
CREATE INDEX idx_credit_reports_user_id ON credit_reports(user_id);
CREATE INDEX idx_credit_reports_bureau ON credit_reports(bureau);
CREATE INDEX idx_credit_reports_report_date ON credit_reports(report_date);

-- Negative items indexes
CREATE INDEX idx_negative_items_user_id ON negative_items(user_id);
CREATE INDEX idx_negative_items_status ON negative_items(status);
CREATE INDEX idx_negative_items_impact_score ON negative_items(impact_score);
```

### Query Optimization

The TypeScript query functions are optimized for:
- Efficient filtering with proper index usage
- Pagination support for large datasets
- Minimal data transfer with selective column queries

## Usage Examples

### TypeScript Query Examples

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCreditReports, createDispute } from '@/lib/supabase/queries'

// Get user's credit reports with filtering
const reports = await getCreditReports(supabase, userId, {
  bureau: 'experian',
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  scoreRange: { min: 300, max: 700 }
})

// Create a new dispute
const dispute = await createDispute(supabase, {
  user_id: userId,
  negative_item_id: 'negative-item-uuid',
  dispute_reason: 'Not my account',
  letter_content: 'Generated dispute letter content...'
})
```

### Database Functions

```sql
-- Add points to user progress
SELECT add_user_points('user-uuid', 50);

-- Automatically called when disputes are resolved
-- Updates user progress with points
```

## Data Types

### JSONB Storage

#### Credit Report Raw Data
```json
{
  "accounts": [
    {
      "creditorName": "Example Bank",
      "accountNumber": "****1234",
      "balance": 1500.00,
      "status": "open",
      "paymentHistory": ["ok", "ok", "late"]
    }
  ],
  "inquiries": [
    {
      "creditorName": "Example Lender",
      "inquiryDate": "2024-01-15",
      "inquiryType": "hard"
    }
  ]
}
```

#### AI Analysis
```json
{
  "summary": "Credit report analysis summary",
  "recommendations": [
    "Pay down credit card balances",
    "Dispute inaccurate late payments"
  ],
  "riskFactors": ["High utilization", "Recent inquiries"],
  "confidenceScore": 0.85
}
```

#### Achievements
```json
[
  {
    "id": "first_report",
    "name": "First Report",
    "description": "Upload your first credit report",
    "earned": true,
    "earnedAt": "2024-01-15T10:00:00Z",
    "points": 10
  }
]
```

## Migration Management

### Creating New Migrations

```bash
# Create a new migration
supabase migration new add_new_feature

# Edit the migration file
# supabase/migrations/YYYYMMDDHHMMSS_add_new_feature.sql

# Apply the migration
supabase db push
```

### Best Practices

1. **Always use transactions** for complex migrations
2. **Test migrations locally** before applying to production
3. **Backup data** before major schema changes
4. **Use descriptive migration names** for better tracking

## Monitoring and Maintenance

### Database Health Checks

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Query Performance

Monitor slow queries and optimize as needed:

```sql
-- Enable query monitoring
SET log_statement = 'all';
SET log_duration = on;
SET log_min_duration_statement = 1000; -- Log queries taking >1s
```

## Support

For issues or questions:
1. Check the Supabase documentation
2. Review the TypeScript types in `src/types/database.ts`
3. Examine the query functions in `src/lib/supabase/queries.ts`
4. Test queries locally using the Supabase CLI

## Schema Version

- **Version**: 1.0.0
- **Migration**: `20240101000001_credit_repair_schema.sql`
- **Last Updated**: January 2024
- **TypeScript Types**: Auto-generated and maintained in `src/types/database.ts` 