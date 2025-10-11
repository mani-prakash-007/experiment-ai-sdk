/**
 * Shared utilities and exports for Playwright tests
 */

// Test data exports
export * from './testData';

// Mock AI functionality exports
export * from './mockAiResponses';
export * from './mockAiModel';

// Common test utilities can be added here
export const TEST_CONFIG = {
  TIMEOUT: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000
  },
  DELAYS: {
    TYPING: 100,
    LOADING: 1000,
    ANIMATION: 500
  }
} as const;