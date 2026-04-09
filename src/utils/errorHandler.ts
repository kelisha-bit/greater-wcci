/**
 * Centralized error handling utilities
 * Provides consistent error formatting, logging, and user-friendly messages
 */

export interface AppError {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  context?: string;
}

/**
 * Parse various error types into a consistent AppError format
 */
export function parseError(error: unknown, context?: string): AppError {
  const timestamp = Date.now();

  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      details: { stack: error.stack },
      timestamp,
      context,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      message: (obj.message as string) || 'Unknown error',
      code: obj.code as string | undefined,
      details: obj,
      timestamp,
      context,
    };
  }

  return {
    message: String(error) || 'An unknown error occurred',
    timestamp,
    context,
  };
}

/**
 * Get a user-friendly error message based on error type and context
 */
export function getUserFriendlyMessage(error: AppError | unknown): string {
  const err = parseError(error) as AppError;

  // Network errors
  if (err.message?.includes('fetch') || err.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Authentication errors
  if (err.code === '401' || err.message?.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Permission errors
  if (err.code === '403' || err.code === '42501' || err.message?.includes('permission')) {
    return 'You do not have permission to perform this action.';
  }

  // Validation errors
  if (err.code === '400' || err.message?.includes('validation')) {
    return 'Please check your input and try again.';
  }

  // Duplicate/conflict errors
  if (err.code === '23505' || err.code === '409') {
    return 'This record already exists. Please use different information.';
  }

  // Not found errors
  if (err.code === '404' || err.message?.includes('not found')) {
    return 'The requested item was not found.';
  }

  // Rate limit errors
  if (err.code === '429' || err.message?.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Server errors
  if (err.code === '500' || err.message?.includes('server')) {
    return 'Server error. Please try again later.';
  }

  // Fallback
  return err.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Log error with optional context (for debugging/monitoring)
 */
export function logError(error: unknown, context?: string): AppError {
  const appError = parseError(error, context);

  // In development, log to console
  if (import.meta.env.DEV) {
    console.error(`[${context || 'Error'}]`, appError);
  }

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // if (import.meta.env.PROD) {
  //   captureException(appError);
  // }

  return appError;
}

/**
 * Retry a failed operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  }
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
  } = options ?? {};

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx)
      if (lastError.message?.includes('401') || lastError.message?.includes('403')) {
        throw lastError;
      }

      if (attempt < maxAttempts) {
        const delayMs = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Max retry attempts exceeded');
}

/**
 * Create a timeout promise that rejects after specified duration
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}
