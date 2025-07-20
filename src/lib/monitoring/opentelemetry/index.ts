// OpenTelemetry Configuration
// Simplified implementation to avoid dependency conflicts

// Mock interfaces for build compatibility
export interface Span {
  setStatus(status: { code: number }): void
  setAttributes(attributes: Record<string, any>): void
  recordException(error: Error): void
  end(): void
}

export interface Tracer {
  startSpan(name: string, options?: any): Span
}

export const SpanAttributes = {
  REQUEST_ID: 'request.id',
  USER_ID: 'user.id',
  HTTP_METHOD: 'http.method',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_URL: 'http.url',
  DB_OPERATION: 'db.operation',
  DB_TABLE: 'db.table',
}

export const SpanStatusCode = {
  OK: 1,
  ERROR: 2,
}

// Mock tracer for build compatibility
const mockTracer: Tracer = {
  startSpan: (name: string, options?: any) => ({
    setStatus: () => {},
    setAttributes: () => {},
    recordException: () => {},
    end: () => {},
  })
}

// Simplified span wrapper
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T> | T,
  attributes?: Record<string, any>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    console.log(`[TRACE] Starting: ${name}`)
    const result = await fn()
    const duration = Date.now() - startTime
    console.log(`[TRACE] Completed: ${name} (${duration}ms)`)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[TRACE] Failed: ${name} (${duration}ms)`, error)
    throw error
  }
}

// Record HTTP request metrics
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number
): void {
  console.log(`[METRICS] HTTP ${method} ${route} - ${statusCode} (${duration}ms)`)
}

// Initialize OpenTelemetry (no-op for now)
export function initializeOpenTelemetry(): void {
  console.log('[OTEL] OpenTelemetry initialization skipped (simplified mode)')
}

// Get tracer instance
export function getTracer(name: string = 'creditai'): Tracer {
  return mockTracer
}

// Shutdown OpenTelemetry
export async function shutdownOpenTelemetry(): Promise<void> {
  console.log('[OTEL] OpenTelemetry shutdown complete')
}

// Export for compatibility
export const otelSDK = {
  start: () => console.log('[OTEL] SDK started (mock)'),
  shutdown: () => Promise.resolve(console.log('[OTEL] SDK shutdown (mock)')),
}