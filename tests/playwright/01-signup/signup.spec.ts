import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from '../shared/testData';

// Configure tests to run serially to avoid rate limiting and server crashes
test.describe.configure({ mode: 'serial' });

test.describe('Sign Up Form Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.locator('h1')).toHaveText('Create Account');
    // Add delay between tests to respect rate limiting
    await page.waitForTimeout(1000);
  });

  // Helper function to fill form and submit
  const fillAndSubmitForm = async (page: any, email: string, password: string, confirmPassword: string) => {
    if (email !== null) await page.fill('#email', email);
    if (password !== null) await page.fill('#password', password);
    if (confirmPassword !== null) await page.fill('#confirmPassword', confirmPassword);
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

  // 1. EMAIL VALIDATION TEST CASES - Based on validateEmail function
  test('Empty Email Field', async ({ page }) => {
    await fillAndSubmitForm(page, '', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Email is required');
    await expectFieldErrorStyling(page, 'email');
    
    // Verify form doesn't submit (still on signup page)
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Email with Only Spaces', async ({ page }) => {
    await fillAndSubmitForm(page, '   ', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Email is required');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Invalid Email Format - Missing @', async ({ page }) => {
    await fillAndSubmitForm(page, 'userexample.com', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Invalid Email Format - Missing Domain', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Invalid Email Format - Missing Extension', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Invalid Email Format - Multiple @', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@@example.com', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Invalid Email Format - Special Characters in Local Part', async ({ page }) => {
    await fillAndSubmitForm(page, 'user name@example.com', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  // 2. PASSWORD VALIDATION TEST CASES - Based on validatePassword function
  test('Empty Password Field', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', '', 'ValidPass123!');
    await expectFieldError(page, 'password', 'Password is required');
    await expectFieldError(page, 'confirmPassword', 'Passwords do not match');
    await expectFieldErrorStyling(page, 'password');
    await expectFieldErrorStyling(page, 'confirmPassword');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Password Too Long (Over 128 characters)', async ({ page }) => {
    // Test the early validation that happens before full form validation
    const longPassword = 'A'.repeat(129) + 'a1!';
    await fillAndSubmitForm(page, 'user@example.com', longPassword, longPassword);
    await expectFieldError(page, 'password', 'Password was too long');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Short Password (Less than 8 characters)', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'Pass1!', 'Pass1!');
    await expectFieldError(page, 'password', 'Password must be at least 8 characters');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Password Without Lowercase Letter', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'PASSWORD123!', 'PASSWORD123!');
    await expectFieldError(page, 'password', 'Password must contain at least one lowercase letter');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Password Without Uppercase Letter', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'password123!', 'password123!');
    await expectFieldError(page, 'password', 'Password must contain at least one uppercase letter');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Password Without Number', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'Password!', 'Password!');
    await expectFieldError(page, 'password', 'Password must contain at least one number');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Password Without Special Character', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'Password123', 'Password123');
    await expectFieldError(page, 'password', 'Password must contain at least one special character');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  // 3. CONFIRM PASSWORD VALIDATION TEST CASES - Based on validateConfirmPassword function
  test('Empty Confirm Password Field', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'ValidPass123!', '');
    await expectFieldError(page, 'confirmPassword', 'Please confirm your password');
    await expectFieldErrorStyling(page, 'confirmPassword');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Confirm Password Too Long (Early Validation)', async ({ page }) => {
    // Test the early validation for confirm password length
    const longPassword = 'A'.repeat(129) + 'a1!';
    await fillAndSubmitForm(page, 'user@example.com', 'ValidPass123!', longPassword);
    await expectFieldError(page, 'confirmPassword', 'Password was too long');
    await expectFieldErrorStyling(page, 'confirmPassword');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Non-Matching Passwords', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'ValidPass123!', 'DifferentPass456@');
    await expectFieldError(page, 'confirmPassword', 'Passwords do not match');
    await expectFieldErrorStyling(page, 'confirmPassword');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Case Sensitive Password Mismatch', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'ValidPass123!', 'validpass123!');
    await expectFieldError(page, 'confirmPassword', 'Passwords do not match');
    await expectFieldErrorStyling(page, 'confirmPassword');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  // 4. COMBINED VALIDATION TEST CASES
  test('All Fields Empty', async ({ page }) => {
    await fillAndSubmitForm(page, '', '', '');
    await expectFieldError(page, 'email', 'Email is required');
    await expectFieldErrorStyling(page, 'email');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  test('Valid Email, Invalid Password Requirements', async ({ page }) => {
    await fillAndSubmitForm(page, 'user@example.com', 'password', 'password');
    await expectFieldError(page, 'password', 'Password must contain at least one uppercase letter');
    await expectFieldErrorStyling(page, 'password');
    
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  // 8. UI/UX TEST CASES
  test('Loading State During Sign Up', async ({ page }) => {
    // Mock a slow response to test loading state
    await page.route('/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await fillAndSubmitForm(page, 'user@example.com', 'ValidPass123!', 'ValidPass123!');
    
    // Check loading state using more specific selector for email signup form button
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    await expect(submitButton).toHaveText('Creating Account...');
    await expect(submitButton).toBeDisabled();
  });

  test('Form Reset After Error', async ({ page }) => {
    // First, create an error
    await fillAndSubmitForm(page, 'invalid', 'ValidPass123!', 'ValidPass123!');
    await expectFieldError(page, 'email', 'Please enter a valid email address');
    
    // Fix the email and resubmit
    await page.fill('#email', 'user@example.com');
    await page.click('form:has(#email) button[type="submit"]');
    
    // The email error should be cleared
    const emailError = page.locator('input#email + p.text-red-400');
    await expect(emailError).not.toBeVisible();
  });

  test('Error State Visual Feedback', async ({ page }) => {
    await fillAndSubmitForm(page, '', 'ValidPass123!', 'ValidPass123!');
    
    // Check that email field has error styling
    const emailField = page.locator('#email');
    await expect(emailField).toHaveClass(/border-red-500/);
    
    // Focus the field and check focus ring
    await emailField.focus();
    await expect(emailField).toHaveClass(/focus:ring-red-500/);
  });

  test('Navigation to Sign In', async ({ page }) => {
    await page.click('text="Sign in"');
    await expect(page).toHaveURL('/auth/signin');
  });

  // 9. EDGE CASES
  test('Multiple Rapid Clicks', async ({ page }) => {
    // Mock a slow response
    await page.route('/api/**', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await fillAndSubmitForm(page, 'user@example.com', 'ValidPass123!', 'ValidPass123!');
    
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    
    // Click multiple times rapidly
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();
    
    // Button should be disabled after first click
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveText('Creating Account...');
  });

  test('Page Refresh During Loading', async ({ page }) => {
    // Mock a slow response
    await page.route('/api/**', route => {
      setTimeout(() => route.continue(), 2000);
    });

    await fillAndSubmitForm(page, 'user@example.com', 'ValidPass123!', 'ValidPass123!');
    
    // Refresh page while processing
    await page.reload();
    
    // Should return to initial state
    await expect(page.locator('h1')).toHaveText('Create Account');
    const submitButton = page.locator('form:has(#email) button[type="submit"]');
    await expect(submitButton).toHaveText('Sign Up');
    await expect(submitButton).not.toBeDisabled();
  });

  test('Network/Connection Error', async ({ page }) => {
    await page.waitForTimeout(3000); // Wait 3 seconds to respect rate limiting in serial mode
    
    // Intercept the actual API endpoint used by your signup form
    await page.route('**/auth/signup', route => {
      route.abort('failed');
    });

    const { email, password } = TEST_ACCOUNTS.NETWORK_ERROR_USER;
    
    await fillAndSubmitForm(page, email, password, password);
    
    await expectGeneralError(page, 'An unexpected error occurred. Please try again.');
  });

  // SUCCESS FLOW TEST CASES
  test('Successful Registration', async ({ page }) => {
    await page.waitForTimeout(4000); // Wait 4 seconds to respect rate limiting in serial mode
    
    const { email, password } = TEST_ACCOUNTS.SUCCESS_USER;
    
    await fillAndSubmitForm(page, email, password, password);
    
    // Form should disappear and confirmation view appears
    await expect(page.locator('h1')).toHaveText('Check Your Email');
    
    // Check success icon
    await expect(page.locator('.bg-green-600 svg')).toBeVisible();
    
    // Check email is displayed
    await expect(page.locator(`text=${email}`)).toBeVisible();
  });

  test('Confirmation View Content', async ({ page }) => {
    await page.waitForTimeout(4000); // Wait 4 seconds to respect rate limiting in serial mode
    
    const { email, password } = TEST_ACCOUNTS.CONFIRMATION_USER;
    
    await fillAndSubmitForm(page, email, password, password);
    
    // Check all confirmation view elements
    await expect(page.locator('h1')).toHaveText('Check Your Email');
    await expect(page.locator('.bg-green-600')).toBeVisible(); // Success icon
    await expect(page.locator(`text=${email}`)).toBeVisible();
    await expect(page.locator('text=Please check your inbox')).toBeVisible();
    await expect(page.locator('text="Go to Sign In"')).toBeVisible();
  });

  test('Confirmation View Direct Access', async ({ page }) => {
    // Navigate directly to signup page (simulating direct access)
    await page.goto('/auth/signup');
    
    // Should show normal signup form, not confirmation view
    await expect(page.locator('h1')).toHaveText('Create Account');
    await expect(page.locator('text="Check Your Email"')).not.toBeVisible();
  });
});
