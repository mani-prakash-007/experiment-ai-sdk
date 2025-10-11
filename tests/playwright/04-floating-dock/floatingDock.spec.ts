import { test, expect } from '@playwright/test';
import { AUTH_STATE_FILE } from '../shared/testData';

// Configure tests to run serially
test.describe.configure({ mode: 'serial' });

/**
 * Chat Tests
 * 
 * IMPORTANT: This test suite uses saved authentication state from signin tests.
 * The user will already be logged in when these tests run.
 * 
 * Prerequisites:
 * - Signup tests must complete successfully first
 * - Signin tests must complete successfully and save auth state
 * - AUTH_STATE_FILE must exist with valid authentication
 */
test.describe('Floating Functionality Tests', () => {
  
  // Use saved authentication state for all tests in this suite
  test.use({ storageState: AUTH_STATE_FILE });

  test.beforeEach(async ({ page }) => {
    // Navigate directly to chat page - user should already be authenticated
    await page.goto('/chat');
    
    // Verify we're on the chat page and authenticated
    await expect(page).toHaveURL('/chat');
  });
});