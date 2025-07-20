export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryAttempts: Map<string, number> = new Map();

  static getInstance(): ErrorHandler {
    if (!this.instance) {
      this.instance = new ErrorHandler();
    }
    return this.instance;
  }

  async handleError(error: Error, context: ErrorContext = {}): Promise<void> {
    const errorId = this.generateErrorId();
    
    // Log error locally
    console.error(`[${errorId}] Error in ${context.component || 'Unknown'}:`, error);

    // Report to monitoring service
    try {
      await this.reportError(error, context, errorId);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }

    // Store error for user feedback
    this.storeErrorForUser(error, context, errorId);
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context: ErrorContext = {}
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      ...options
    };

    const operationKey = `${context.component}-${context.action}`;
    let attempts = this.retryAttempts.get(operationKey) || 0;

    try {
      const result = await operation();
      this.retryAttempts.delete(operationKey);
      return result;
    } catch (error) {
      attempts++;
      this.retryAttempts.set(operationKey, attempts);

      if (attempts >= config.maxAttempts) {
        this.retryAttempts.delete(operationKey);
        await this.handleError(error as Error, {
          ...context,
          metadata: { ...context.metadata, attempts }
        });
        throw error;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempts - 1),
        config.maxDelay
      );

      await this.sleep(delay);
      return this.withRetry(operation, config, context);
    }
  }

  createErrorState(error: Error, context: ErrorContext = {}) {
    return {
      hasError: true,
      error: {
        message: this.getUserFriendlyMessage(error),
        code: this.getErrorCode(error),
        canRetry: this.canRetry(error),
        context
      }
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async reportError(error: Error, context: ErrorContext, errorId: string): Promise<void> {
    const errorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport)
    });
  }

  private storeErrorForUser(error: Error, context: ErrorContext, errorId: string): void {
    const userError = {
      id: errorId,
      message: this.getUserFriendlyMessage(error),
      timestamp: new Date().toISOString(),
      canRetry: this.canRetry(error),
      context: context.component
    };

    // Store in localStorage for user feedback
    try {
      const existingErrors = JSON.parse(localStorage.getItem('userErrors') || '[]');
      existingErrors.push(userError);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('userErrors', JSON.stringify(existingErrors));
    } catch (storageError) {
      console.warn('Failed to store error in localStorage:', storageError);
    }
  }

  private getUserFriendlyMessage(error: Error): string {
    // Map technical errors to user-friendly messages
    const errorMessages: Record<string, string> = {
      'NetworkError': 'Unable to connect to our servers. Please check your internet connection.',
      'TimeoutError': 'The request took too long to complete. Please try again.',
      'ValidationError': 'The information provided is invalid. Please check and try again.',
      'AuthenticationError': 'Your session has expired. Please log in again.',
      'AuthorizationError': 'You do not have permission to perform this action.',
      'NotFoundError': 'The requested resource was not found.',
      'RateLimitError': 'Too many requests. Please wait a moment before trying again.',
      'ServerError': 'We encountered a server error. Our team has been notified.'
    };

    return errorMessages[error.name] || 'An unexpected error occurred. Please try again.';
  }

  private getErrorCode(error: Error): string {
    // Extract error codes from different error types
    if ('code' in error) {
      return (error as any).code;
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  private canRetry(error: Error): boolean {
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'ServerError',
      'RateLimitError'
    ];
    
    return retryableErrors.includes(error.name) || 
           error.message.includes('fetch') ||
           error.message.includes('timeout');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}