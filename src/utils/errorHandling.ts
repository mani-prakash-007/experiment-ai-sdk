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