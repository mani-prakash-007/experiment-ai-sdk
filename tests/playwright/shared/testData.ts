/**
 * Simple test data for signup and signin tests
 */

// Test accounts - these will be created during signup and used in signin
export const TEST_ACCOUNTS = {
  SUCCESS_USER: {
    email: 'manitest1@gmail.com',
    password: 'ValidPass123!'
  },
  CONFIRMATION_USER: {
    email: 'manitest2@gmail.com', 
    password: 'ValidPass123!'
  },
  NETWORK_ERROR_USER: {
    email: 'manitest3@gmail.com',
    password: 'ValidPass123!'
  }
};

// Authentication state file path
export const AUTH_STATE_FILE = 'tests/playwright/.auth/user.json';
