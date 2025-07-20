# Infrastructure & Deployment Improvements for CreditAI

## Current Infrastructure Issues

### 1. Google Cloud Configuration Complexity
**Problem:** Multiple configuration files and complex setup process
**Impact:** Difficult deployment and maintenance
**Solution:** Streamlined configuration management

### 2. Environment Variable Management
**Problem:** 50+ environment variables across different services
**Impact:** Configuration drift and deployment errors
**Solution:** Centralized configuration with validation

### 3. Monitoring & Observability Gaps
**Problem:** Limited visibility into system performance and errors
**Impact:** Slow incident response and debugging difficulties
**Solution:** Comprehensive monitoring stack

## Comprehensive Solutions

### 1. Simplified Google Cloud Configuration

```typescript
// src/lib/google-cloud/configManager.ts
export class GoogleCloudConfigManager {
  private static instance: GoogleCloudConfigManager
  private config: GoogleCloudConfig | null = null

  static getInstance(): GoogleCloudConfigManager {
    if (!GoogleCloudConfigManager.instance) {
      GoogleCloudConfigManager.instance = new GoogleCloudConfigManager()
    }
    return GoogleCloudConfigManager.instance
  }

  async getConfig(): Promise<GoogleCloudConfig> {
    if (!this.config) {
      this.config = await this.loadAndValidateConfig()
    }
    return this.config
  }

  private async loadAndValidateConfig(): Promise<GoogleCloudConfig> {
    const config: GoogleCloudConfig = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      credentials: await this.loadCredentials(),
      services: {
        vision: {
          enabled: process.env.GOOGLE_CLOUD_VISION_ENABLED === 'true',
          endpoint: process.env.GOOGLE_CLOUD_VISION_ENDPOINT
        },
        documentAI: {
          enabled: process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true',
          processorId: process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID,
          endpoint: process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENDPOINT
        }
      }
    }

    // Validate configuration
    const validation = this.validateConfig(config)
    if (!validation.isValid) {
      throw new Error(`Invalid Google Cloud configuration: ${validation.errors.join(', ')}`)
    }

    return config
  }

  private async loadCredentials(): Promise<GoogleCloudCredentials> {
    // Priority order: Service Account Key > Application Default > API Key
    if (process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY) {
      return {
        type: 'service-account',
        credentials: JSON.parse(process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY)
      }
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return {
        type: 'application-default',
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
      }
    }

    if (process.env.GOOGLE_AI_API_KEY) {
      return {
        type: 'api-key',
        apiKey: process.env.GOOGLE_AI_API_KEY
      }
    }

    throw new Error('No valid Google Cloud credentials found')
  }
}
```

### 2. Environment Configuration Validation

```typescript
// src/lib/config/environmentValidator.ts
export class EnvironmentValidator {
  private static readonly REQUIRED_VARS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_AI_API_KEY'
  ]

  private static readonly OPTIONAL_VARS = [
    'SENTRY_DSN',
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY'
  ]

  static validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {}
    }

    // Check required variables
    for (const varName of this.REQUIRED_VARS) {
      const value = process.env[varName]
      if (!value) {
        result.isValid = false
        result.errors.push(`Missing required environment variable: ${varName}`)
      } else {
        result.summary[varName] = this.maskSensitiveValue(varName, value)
      }
    }

    // Check optional variables
    for (const varName of this.OPTIONAL_VARS) {
      const value = process.env[varName]
      if (!value) {
        result.warnings.push(`Optional environment variable not set: ${varName}`)
      } else {
        result.summary[varName] = this.maskSensitiveValue(varName, value)
      }
    }

    // Validate specific formats
    this.validateSpecificFormats(result)

    return result
  }

  private static validateSpecificFormats(result: ValidationResult): void {
    // Validate Supabase URL format
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
      result.warnings.push('Supabase URL format may be incorrect')
    }

    // Validate Google Cloud Project ID format
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    if (projectId && !projectId.match(/^[a-z0-9-]+$/)) {
      result.warnings.push('Google Cloud Project ID format may be incorrect')
    }
  }

  private static maskSensitiveValue(varName: string, value: string): string {
    const sensitivePatterns = ['key', 'secret', 'token', 'password']
    const isSensitive = sensitivePatterns.some(pattern => 
      varName.toLowerCase().includes(pattern)
    )

    if (isSensitive) {
      return value.substring(0, 8) + '...' + value.substring(value.length - 4)
    }

    return value
  }
}
```

### 3. Comprehensive Monitoring Stack

```typescript
// src/lib/monitoring/monitoringStack.ts
export class MonitoringStack {
  private static instance: MonitoringStack
  private metrics: MetricsCollector
  private logger: StructuredLogger
  private alerting: AlertingSystem

  constructor() {
    this.metrics = new MetricsCollector()
    this.logger = new StructuredLogger()
    this.alerting = new AlertingSystem()
  }

  static getInstance(): MonitoringStack {
    if (!MonitoringStack.instance) {
      MonitoringStack.instance = new MonitoringStack()
    }
    return MonitoringStack.instance
  }

  // Application Performance Monitoring
  trackPerformance(operation: string, duration: number, metadata?: any): void {
    this.metrics.histogram('operation_duration', duration, {
      operation,
      ...metadata
    })

    if (duration > 5000) { // 5 seconds
      this.alerting.sendAlert({
        type: 'performance',
        severity: 'warning',
        message: `Slow operation detected: ${operation} took ${duration}ms`,
        metadata
      })
    }
  }

  // Error Tracking
  trackError(error: Error, context?: any): void {
    this.logger.error('Application error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    })

    this.metrics.counter('errors_total', 1, {
      error_type: error.name,
      ...context
    })

    // Critical error alerting
    if (this.isCriticalError(error)) {
      this.alerting.sendAlert({
        type: 'error',
        severity: 'critical',
        message: `Critical error: ${error.message}`,
        context
      })
    }
  }

  // Business Metrics
  trackBusinessMetric(metric: string, value: number, tags?: any): void {
    this.metrics.gauge(metric, value, tags)
    
    // Track important business events
    if (metric === 'pdf_processed') {
      this.logger.info('PDF processed', { value, tags })
    }
    
    if (metric === 'dispute_submitted') {
      this.logger.info('Dispute submitted', { value, tags })
    }
  }

  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      'database connection',
      'google cloud',
      'authentication',
      'payment processing'
    ]

    return criticalPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    )
  }
}
```

### 4. Automated Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy CreditAI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
        env:
          NODE_ENV: test
      
      - name: Run security audit
        run: npm audit --audit-level moderate
      
      - name: Check TypeScript
        run: npm run type-check
      
      - name: Lint code
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: .next/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_URL: ${{ steps.deploy.outputs.preview-url }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Health check
        run: |
          curl -f https://creditai.com/api/health || exit 1
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 5. Infrastructure as Code

```typescript
// infrastructure/main.ts
import * as gcp from "@pulumi/gcp"
import * as pulumi from "@pulumi/pulumi"

// Google Cloud Project Configuration
const project = new gcp.organizations.Project("creditai-project", {
  projectId: "creditai-production",
  name: "CreditAI Production",
  billingAccount: process.env.GCP_BILLING_ACCOUNT!,
})

// Enable required APIs
const apis = [
  "vision.googleapis.com",
  "documentai.googleapis.com",
  "storage.googleapis.com",
  "cloudbuild.googleapis.com"
].map(api => new gcp.projects.Service(`${api}-service`, {
  project: project.projectId,
  service: api,
}))

// Document AI Processor
const documentProcessor = new gcp.documentai.Processor("credit-report-processor", {
  project: project.projectId,
  location: "us",
  displayName: "Credit Report Processor",
  type: "FORM_PARSER_PROCESSOR",
})

// Cloud Storage for file processing
const storageBucket = new gcp.storage.Bucket("creditai-documents", {
  project: project.projectId,
  location: "US",
  storageClass: "STANDARD",
  uniformBucketLevelAccess: true,
  lifecycleRules: [{
    condition: {
      age: 30,
    },
    action: {
      type: "Delete",
    },
  }],
})

// Service Account for application
const serviceAccount = new gcp.serviceaccount.Account("creditai-app", {
  project: project.projectId,
  accountId: "creditai-app",
  displayName: "CreditAI Application Service Account",
})

// IAM bindings
const iamBindings = [
  new gcp.projects.IAMBinding("vision-api-binding", {
    project: project.projectId,
    role: "roles/ml.developer",
    members: [pulumi.interpolate`serviceAccount:${serviceAccount.email}`],
  }),
  new gcp.projects.IAMBinding("documentai-binding", {
    project: project.projectId,
    role: "roles/documentai.apiUser",
    members: [pulumi.interpolate`serviceAccount:${serviceAccount.email}`],
  }),
]

// Export important values
export const projectId = project.projectId
export const documentProcessorId = documentProcessor.name
export const serviceAccountEmail = serviceAccount.email
export const storageBucketName = storageBucket.name
```

## Implementation Roadmap

### Phase 1: Configuration Management (Week 1)
- [ ] Implement centralized configuration management
- [ ] Add environment validation
- [ ] Streamline Google Cloud setup

### Phase 2: Monitoring & Observability (Week 2)
- [ ] Deploy comprehensive monitoring stack
- [ ] Set up alerting and notifications
- [ ] Implement performance tracking

### Phase 3: Deployment Automation (Week 3)
- [ ] Set up CI/CD pipeline
- [ ] Implement infrastructure as code
- [ ] Add automated testing and deployment

### Phase 4: Optimization & Scaling (Week 4)
- [ ] Performance optimization
- [ ] Auto-scaling configuration
- [ ] Cost optimization

## Expected Benefits

- **Deployment Time:** 2 hours → 15 minutes
- **Configuration Errors:** 80% reduction
- **Mean Time to Recovery:** 4 hours → 30 minutes
- **Infrastructure Costs:** 25% reduction
- **Developer Productivity:** 40% improvement