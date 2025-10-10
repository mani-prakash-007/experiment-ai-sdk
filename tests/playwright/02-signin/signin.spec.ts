import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS, AUTH_STATE_FILE } from '../shared/testData';

// Configure tests to run serially to avoid rate limiting and server crashes
test.describe.configure({ mode: 'serial' });

/**
 * Sign In Form Validation Tests
 * 
 * IMPORTANT: This test suite depends on accounts created by the signup tests.
 * The directory naming (01-signup, 02-signin) ensures proper execution order.
 * 
 * Prerequisites:
 * - Signup tests must complete successfully first
 * - Valid test accounts must exist in the system (manitest1@gmail.com, manitest2@gmail.com, etc.)
 * - Tests use predefined email addresses to avoid Supabase validation issues
 */
test.describe('Sign In Form Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.locator('h1')).toHaveText('Welcome Back');
    // Add delay between tests to respect rate limiting
    await page.waitForTimeout(1000);
  });

  // Helper function to fill form and submit
  const fillAndSubmitForm = async (page: any, email: string, password: string) => {
    if (email !== null) await page.fill('#email', email);
    if (password !== null) await page.fill('#password', password);
    await page.click('form:has(#email) button[type="submit"]');
  };

  // Helper function to check field error message
  const expectFieldError = async (page: any, fieldId: string, expectedMessage: string) => {
    const errorElement = page.locator(`input#${fieldId} + p.text-sm.text-red-400`);
    await expect(errorElement).toHaveText(expectedMessage);
  };

  // Helper function to check general error message
  const expectGeneralError = async (page: any, expectedMessage: string) => {
    const errorElement = page.locator('.bg-red-900\\/50 p.text-red-300');
    await expect(errorElement).toHaveText(expectedMessage);
  };

  // Helper function to check field has error styling
  const expectFieldErrorStyling = async (page: any, fieldId: string) => {
    const field = page.locator(`#${fieldId}`);
    await expect(field).toHaveClass(/border-red-500/);
    await expect(field).toHaveClass(/focus:ring-red-500/);
  };

  // EMAIL VALIDATION TEST CASES
  test('Empty Email Field', async ({ page }) => {
    await fillAndSubmitForm(page, '', 'validpassword');
    await expectFieldError(page, 'email', 'Email is required');
    await expectFieldErrorStyling(page, 'email');
    
    // Verify form doesn't submit (still on signin page)
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Email with Only Spaces', async ({ page }) => {
    await fillAndSubmitForm(page, '   ', 'validpassword');
    await expectFieldError(page, 'email', 'Email is required');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Invalid Email Format - Missing @', async ({ page }) => {
    await fillAndSubmitForm(page, 'userexample.com', 'validpassword');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Invalid Email Format - Missing Domain', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@', 'validpassword');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Invalid Email Format - Missing Extension', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example', 'validpassword');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Invalid Email Format - Multiple @', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@@example.com', 'validpassword');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Invalid Email Format - Special Characters in Local Part', async ({ page }) => {
    await fillAndSubmitForm(page, 'user name@example.com', 'validpassword');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  // PASSWORD VALIDATION TEST CASES
  test('Empty Password Field', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', '');
    await expectFieldError(page, 'password', 'Password is required');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Short Password (Less than 6 characters)', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', '12345');
    await expectFieldError(page, 'password', 'Password must be at least 6 characters');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Password Exactly 6 Characters', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', '123456');
    
    // Should not show validation error for password length
    const passwordError = page.locator('input#password + p.text-sm.text-red-400');
    await expect(passwordError).not.toBeVisible();
    
    // Since credentials are invalid, expect server error instead
    await expectGeneralError(page, 'Invalid email or password. Please check your credentials and try again.');
  });

  test('Password Too Long (Over 128 characters)', async ({ page }) => {
    const longPassword = 'A'.repeat(129);
    await fillAndSubmitForm(page, 'user@example.com', longPassword);
    await expectFieldError(page, 'password', 'Password was too long');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Password Exactly 128 Characters', async ({ page }) => {
    const exactPassword = 'A'.repeat(128);
    await fillAndSubmitForm(page, 'user@example.com', exactPassword);
    
    // Should not show validation error for password length
    const passwordError = page.locator('input#password + p.text-sm.text-red-400');
    await expect(passwordError).not.toBeVisible();
    
    // Since credentials are invalid, expect server error instead
    await expectGeneralError(page, 'Invalid email or password. Please check your credentials and try again.');
  });

  // COMBINED VALIDATION TEST CASES
  test('Both Fields Empty', async ({ page }) => {
    await fillAndSubmitForm(page, '', '');
    await expectFieldError(page, 'email', 'Email is required');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Invalid Email and Short Password', async ({ page }) => {
    await fillAndSubmitForm(page, 'invalid-email', '123');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('Valid Email and Empty Password', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', '');
    await expectFieldError(page, 'password', 'Password is required');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  // SERVER-SIDE ERROR HANDLING TEST CASES
  test('Invalid Login Credentials', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'wrongpassword');
    await expectGeneralError(page, 'Invalid email or password. Please check your credentials and try again.');
    
    // Check that loading state ends
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    await expect(submitButton).toHaveText('Sign In');
    await expect(submitButton).not.toBeDisabled();
  });

  test('Network Connection Error', async ({ page }) => {
    // Intercept the auth endpoint and cause it to fail
    await page.route('**/auth/signin**', route => {
      route.abort('failed');
    });

    await fillAndSubmitForm(page, 'user@example.com', 'validpassword');
    await expectGeneralError(page, 'An unexpected error occurred. Please try again.');
    
    // Check that loading state ends
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    await expect(submitButton).toHaveText('Sign In');
    await expect(submitButton).not.toBeDisabled();
  });

  // UI/UX TEST CASES
  test('Loading State During Sign In', async ({ page }) => {
    // Mock a slow response to test loading state
    await page.route('/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await fillAndSubmitForm(page, 'user@example.com', 'validpassword');
    
    // Check loading state
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    await expect(submitButton).toHaveText('Signing In...');
    await expect(submitButton).toBeDisabled();
  });

  test('Form Reset After Error', async ({ page }) => {
    // First, create an error
    await fillAndSubmitForm(page, 'invalid', 'validpassword');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    
    // Fix the email and resubmit
    await page.fill('#email', 'user@example.com');
    await page.click('form:has(#email) button[type="submit"]');
    
    // The email error should be cleared
    const emailError = page.locator('input#email + p.text-red-400');
    await expect(emailError).not.toBeVisible();
  });

  test('Error State Visual Feedback', async ({ page }) => {
    await fillAndSubmitForm(page, '', 'validpassword');
    
    // Check that email field has error styling
    const emailField = page.locator('#email');
    await expect(emailField).toHaveClass(/border-red-500/);
    
    // Focus the field and check focus ring
    await emailField.focus();
    await expect(emailField).toHaveClass(/focus:ring-red-500/);
  });

  test('Navigation to Sign Up', async ({ page }) => {
    await page.click('text="Sign up"');
    await expect(page).toHaveURL('/auth/signup');
  });

  // EDGE CASES
  test('Multiple Rapid Clicks', async ({ page }) => {
    // Mock a slow response
    await page.route('/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await fillAndSubmitForm(page, 'user@example.com', 'validpassword');
    
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    
    // Click multiple times rapidly
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();
    
    // Button should be disabled after first click
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveText('Signing In...');
  });

  test('Page Refresh During Loading', async ({ page }) => {
    // Mock a slow response
    await page.route('/api/**', route => {
      setTimeout(() => route.continue(), 2000);
    });

    await fillAndSubmitForm(page, 'user@example.com', 'validpassword');
    
    // Refresh page while processing
    await page.reload();
    
    // Should return to initial state
    await expect(page.locator('h1')).toHaveText('Welcome Back');
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    await expect(submitButton).toHaveText('Sign In');
    await expect(submitButton).not.toBeDisabled();
  });

  test('Browser Back Button After Error', async ({ page }) => {
    // Create an error state
    await fillAndSubmitForm(page, 'invalid', 'validpassword');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    
    // Navigate away and come back
    await page.goto('/auth/signup');
    await page.goBack();
    
    // Form should be reset
    await expect(page.locator('h1')).toHaveText('Welcome Back');
    const emailField = page.locator('#email');
    const passwordField = page.locator('#password');
    await expect(emailField).toHaveValue('');
    await expect(passwordField).toHaveValue('');
    
    // No error messages should be shown
    const emailError = page.locator('input#email + p.text-red-400');
    const passwordError = page.locator('input#password + p.text-red-400');
    await expect(emailError).not.toBeVisible();
    await expect(passwordError).not.toBeVisible();
  });

  // SUCCESS FLOW TEST CASES - These should run last since they will log the user in
  test('Valid Email Input with Valid Credentials', async ({ page }) => {
    await page.waitForTimeout(4000); // Wait to respect rate limiting
    
    // Use credentials that match a user who signed up in signup tests
    // This should correspond to the "Successful Registration" test in signup.spec.ts
    const { email, password } = TEST_ACCOUNTS.SUCCESS_USER;
    
    await fillAndSubmitForm(page, email, password);
    
    // Should redirect to chat page (successful login)
    await page.waitForURL('/chat');
    await expect(page).toHaveURL('/chat');
    
    // Save the authentication state for use in subsequent tests
    await page.context().storageState({ path: AUTH_STATE_FILE });
    
    // No validation errors should be shown before redirect
    const emailError = page.locator('input#email + p.text-red-400');
    const passwordError = page.locator('input#password + p.text-red-400');
    await expect(emailError).not.toBeVisible();
    await expect(passwordError).not.toBeVisible();
  });

  test('Successful Sign In with Recently Created Account', async ({ page }) => {
    await page.waitForTimeout(5000); // Wait to respect rate limiting
    
    // Use a pattern that should match the "Confirmation View Content" test in signup.spec.ts
    const { email, password } = TEST_ACCOUNTS.CONFIRMATION_USER;
    
    await fillAndSubmitForm(page, email, password);
    
    // Should redirect away from signin page on success
    await page.waitForTimeout(2000); // Give time for redirect
    
    // Check we're no longer on signin page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/chat');
  });
});