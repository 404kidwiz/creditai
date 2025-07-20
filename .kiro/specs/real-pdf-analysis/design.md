# Design Document

## Overview

This design implements a comprehensive PDF analysis system that replaces mock data with real credit report processing. The system will use Google Cloud Document AI for PDF text extraction, enhanced text parsing algorithms for credit data extraction, and AI-powered analysis for generating dispute recommendations.

## Architecture

### High-Level Architecture

```
PDF Upload → Google Cloud Document AI → Text Parser → AI Analyzer → Results Storage → UI Display
     ↓              ↓                      ↓            ↓              ↓             ↓
  File Validation  OCR/Text Extraction  Data Extraction  Recommendations  Database    Dashboard
```

### Component Overview

1. **PDF Processing Pipeline**: Handles file upload, validation, and text extraction
2. **Credit Data Parser**: Extracts structured credit information from raw text
3. **AI Analysis Engine**: Generates insights and dispute recommendations
4. **Configuration Manager**: Manages Google Cloud and AI service configurations
5. **Fallback System**: Provides alternative processing when cloud services fail

## Components and Interfaces

### 1. Enhanced PDF Processor

**Purpose**: Replace mock data with real PDF text extraction and parsing

**Key Methods**:
- `processPDF(file: File)`: Main processing pipeline
- `extractTextWithDocumentAI(file: File)`: Google Cloud Document AI integration
- `extractTextWithVisionAPI(images: string[])`: Fallback OCR processing
- `parseExtractedText(text: string)`: Convert raw text to structured data

**Configuration Requirements**:
- Google Cloud Project ID
- Document AI Processor ID
- Vision API credentials
- Gemini AI API key for analysis

### 2. Credit Report Parser

**Purpose**: Extract structured credit information from raw PDF text

**Key Components**:
- **Personal Information Extractor**: Name, address, SSN, DOB
- **Credit Score Parser**: Multi-bureau score extraction with confidence levels
- **Account Parser**: Creditor details, balances, payment history, account status
- **Negative Item Detector**: Late payments, collections, charge-offs, public records
- **Inquiry Extractor**: Hard/soft inquiries with dates and purposes

**Parsing Strategies**:
- Pattern matching for common credit report formats
- Machine learning-based entity recognition
- Multi-provider format support (Experian, Equifax, TransUnion, Credit Karma, etc.)

### 3. AI Analysis Engine

**Purpose**: Generate intelligent insights and dispute recommendations

**Analysis Components**:
- **Dispute Opportunity Identifier**: Scan for disputable items
- **Legal Basis Generator**: FCRA-compliant dispute reasons
- **Success Probability Calculator**: ML-based success prediction
- **Impact Estimator**: Potential credit score improvement calculation
- **Priority Ranker**: Order disputes by impact and success probability

### 4. Configuration Management

**Purpose**: Manage external service configurations and credentials

**Configuration Files**:
- `.env.local`: Environment variables for API keys
- `google-cloud-key.json`: Service account credentials
- `src/lib/google-cloud/config.ts`: Configuration validation

**Required Environment Variables**:
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_AI_API_KEY=your-gemini-api-key
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
```

## Data Models

### Enhanced Credit Report Data Structure

```typescript
interface EnhancedCreditReportData {
  personalInfo: {
    name: string
    address: string
    ssn?: string // Masked for security
    dateOfBirth?: string
    confidence: number // Extraction confidence
  }
  creditScores: {
    [bureau: string]: {
      score: number
      date: string
      factors: string[]
      confidence: number
      dataQuality: number
    }
  }
  accounts: EnhancedAccount[]
  negativeItems: EnhancedNegativeItem[]
  inquiries: EnhancedInquiry[]
  publicRecords: PublicRecord[]
  extractionMetadata: {
    processingMethod: string
    confidence: number
    processingTime: number
    documentQuality: number
  }
}
```

### Enhanced Account Structure

```typescript
interface EnhancedAccount {
  id: string
  creditorName: string
  accountNumber: string // Masked
  accountType: AccountType
  balance: number
  creditLimit?: number
  paymentHistory: PaymentHistoryEntry[]
  status: AccountStatus
  openDate: string
  lastReported: string
  bureaus: Bureau[]
  confidence: number
  extractionNotes?: string[]
}
```

## Error Handling

### Graceful Degradation Strategy

1. **Primary**: Google Cloud Document AI (highest accuracy)
2. **Secondary**: Google Cloud Vision API (good for images)
3. **Tertiary**: Client-side PDF.js + Tesseract.js (basic OCR)
4. **Fallback**: Enhanced mock data with user notification

### Error Recovery

- **Service Unavailable**: Automatic fallback to next processing method
- **Invalid PDF**: Clear error message with format requirements
- **Low Confidence**: Warning message with manual review option
- **Parsing Failures**: Partial results with identified issues

## Testing Strategy

### Unit Tests
- PDF text extraction accuracy
- Credit data parsing validation
- AI analysis result verification
- Configuration validation

### Integration Tests
- End-to-end PDF processing pipeline
- Google Cloud service integration
- Database storage and retrieval
- UI display of real vs mock data

### Performance Tests
- Large PDF processing times
- Concurrent upload handling
- Memory usage optimization
- API response times

## Security Considerations

### Data Protection
- **PII Masking**: Automatic masking of SSN, account numbers
- **Encryption**: Sensitive data encrypted at rest
- **Temporary Storage**: PDFs deleted after processing
- **Access Control**: User-specific data isolation

### API Security
- **Rate Limiting**: Prevent abuse of processing endpoints
- **Input Validation**: Strict file type and size limits
- **Error Sanitization**: No sensitive data in error messages
- **Audit Logging**: Track processing activities

## Deployment Strategy

### Phase 1: Configuration Setup
- Set up Google Cloud project and services
- Configure Document AI processor
- Set up environment variables
- Test service connectivity

### Phase 2: Core Implementation
- Implement enhanced PDF processor
- Build credit report parser
- Integrate AI analysis engine
- Add comprehensive error handling

### Phase 3: Testing and Validation
- Test with real credit report samples
- Validate extraction accuracy
- Performance optimization
- Security testing

### Phase 4: Production Deployment
- Deploy to production environment
- Monitor processing success rates
- Collect user feedback
- Iterative improvements