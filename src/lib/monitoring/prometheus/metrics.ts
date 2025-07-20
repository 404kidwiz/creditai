// Prometheus Metrics Configuration
// Simplified implementation to avoid dependency conflicts

// Mock interfaces for build compatibility
interface MetricLabels {
  [key: string]: string | number
}

interface Counter {
  inc(labels?: MetricLabels, value?: number): void
}

interface Histogram {
  observe(labels: MetricLabels, value: number): void
}

interface Gauge {
  set(labels: MetricLabels, value: number): void
}

// Mock registry
export const register = {
  setDefaultLabels: (labels: Record<string, string>) => {
    console.log('[METRICS] Default labels set:', labels)
  },
  registerMetric: (metric: any) => {
    console.log('[METRICS] Metric registered')
  },
  metrics: () => Promise.resolve('# Mock Prometheus metrics\n'),
  clear: () => {
    console.log('[METRICS] Registry cleared')
  }
}

// Mock metrics
const createMockCounter = (name: string): Counter => ({
  inc: (labels?: MetricLabels, value = 1) => {
    console.log(`[COUNTER] ${name}:`, { labels, value })
  }
})

const createMockHistogram = (name: string): Histogram => ({
  observe: (labels: MetricLabels, value: number) => {
    console.log(`[HISTOGRAM] ${name}:`, { labels, value })
  }
})

const createMockGauge = (name: string): Gauge => ({
  set: (labels: MetricLabels, value: number) => {
    console.log(`[GAUGE] ${name}:`, { labels, value })
  }
})

// HTTP metrics
export const httpRequestCounter = createMockCounter('http_requests_total')
export const httpRequestDuration = createMockHistogram('http_request_duration_seconds')
export const httpResponseSize = createMockHistogram('http_response_size_bytes')

// Database metrics
export const dbConnectionsGauge = createMockGauge('db_connections_active')
export const dbQueryDuration = createMockHistogram('db_query_duration_seconds')
export const dbQueryCounter = createMockCounter('db_queries_total')

// AI model metrics
export const aiRequestCounter = createMockCounter('ai_requests_total')
export const aiRequestDuration = createMockHistogram('ai_request_duration_seconds')
export const aiTokenUsage = createMockCounter('ai_tokens_total')

// Business metrics
export const creditReportsProcessed = createMockCounter('credit_reports_processed_total')
export const disputeLettersGenerated = createMockCounter('dispute_letters_generated_total')
export const userRegistrations = createMockCounter('user_registrations_total')

// Error metrics
export const errorCounter = createMockCounter('errors_total')
export const alertCounter = createMockCounter('alerts_total')

// Performance metrics
export const memoryUsageGauge = createMockGauge('memory_usage_bytes')
export const cpuUsageGauge = createMockGauge('cpu_usage_percent')

// Custom metrics functions
export function recordHttpMetrics(
  method: string,
  route: string,
  statusCode: number,
  duration: number
): void {
  const labels = { method, route, status_code: statusCode.toString() }
  httpRequestCounter.inc(labels)
  httpRequestDuration.observe(labels, duration / 1000)
}

export function recordDbMetrics(
  operation: string,
  table: string,
  duration: number,
  success: boolean
): void {
  const labels = { operation, table, success: success.toString() }
  dbQueryCounter.inc(labels)
  dbQueryDuration.observe(labels, duration / 1000)
}

export function recordAiMetrics(
  provider: string,
  model: string,
  duration: number,
  success: boolean,
  tokenCount?: { input: number; output: number }
): void {
  const labels = { provider, model, success: success.toString() }
  aiRequestCounter.inc(labels)
  aiRequestDuration.observe(labels, duration / 1000)
  
  if (tokenCount) {
    aiTokenUsage.inc({ ...labels, type: 'input' }, tokenCount.input)
    aiTokenUsage.inc({ ...labels, type: 'output' }, tokenCount.output)
  }
}

export function recordBusinessMetrics(
  type: string,
  labels: MetricLabels
): void {
  switch (type) {
    case 'credit_report':
      creditReportsProcessed.inc(labels)
      break
    case 'dispute_letter':
      disputeLettersGenerated.inc(labels)
      break
    case 'user_registration':
      userRegistrations.inc(labels)
      break
  }
}

export function recordError(
  type: string,
  severity: string,
  component: string
): void {
  errorCounter.inc({ type, severity, component })
}

export function recordAlert(
  type: string,
  severity: string,
  component: string
): void {
  alertCounter.inc({ type, severity, component })
}

export function updateSystemMetrics(): void {
  // Mock system metrics
  const memoryUsage = process.memoryUsage()
  memoryUsageGauge.set({}, memoryUsage.heapUsed)
  
  // Mock CPU usage
  cpuUsageGauge.set({}, Math.random() * 100)
}

// Export metrics endpoint data
export async function getMetrics(): Promise<string> {
  return `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/health",status_code="200"} 1

# HELP app_info Application information
# TYPE app_info gauge
app_info{version="1.0.0",environment="${process.env.NODE_ENV || 'development'}"} 1
`
}

// Initialize metrics collection
export function initializeMetrics(): void {
  console.log('[METRICS] Prometheus metrics initialized (simplified mode)')
  
  // Update system metrics periodically
  setInterval(updateSystemMetrics, 10000)
}

// Cleanup
export function shutdownMetrics(): void {
  register.clear()
  console.log('[METRICS] Metrics collection shutdown')
}