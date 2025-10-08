// Simple error handling utilities

export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  exponentialBackoff?: boolean;
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  delayMs: 1000,
  exponentialBackoff: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxRetries, delayMs, exponentialBackoff } = { ...defaultRetryOptions, ...options };
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay for next attempt
      const delay = exponentialBackoff 
        ? delayMs * Math.pow(2, attempt)
        : delayMs;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('timeout') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError' && error.message.includes('Failed to fetch')
    );
  }
  return false;
}

export function isServerError(error: unknown): boolean {
  if (error instanceof Error && error.message.includes('500')) {
    return true;
  }
  return false;
}