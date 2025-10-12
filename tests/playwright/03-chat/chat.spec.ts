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
test.describe('Chat Functionality Tests', () => {
  
  // Use saved authentication state for all tests in this suite
  test.use({ storageState: AUTH_STATE_FILE });

  test.beforeEach(async ({ page }) => {
    // Navigate directly to chat page - user should already be authenticated
    await page.goto('/chat');
    
    // Verify we're on the chat page and authenticated
    await expect(page).toHaveURL('/chat');
  });

  test('User is authenticated and on chat page', async ({ page }) => {
    await expect(page).toHaveURL('/chat');

    await expect(page.locator('h2').nth(1)).toHaveText('Welcome to AI Canvas Chat');
  });

  test('Create a new session for Greeting', async({ page }) => {
    // Increase timeout for this test due to AI response generation
    test.setTimeout(60000);
    
    await page.getByTestId('iconbar-new-session-button').click();
    await page.getByTestId('floating-dock').waitFor({ state: 'visible' });
    await page.getByTestId('sidebar-toggle-button').click();
    await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
    await expect(page.getByTestId('session-item-0')).toContainText('Untitled Session');
    await page.getByTestId('sidebar-toggle-button').click();
    const input = page.getByTestId('chat-input');
    await input.fill('Hi, How are you ?');
    test.setTimeout(60000);
    await page.getByTestId('chat-submit-button').click();

    // Wait for user message to appear with increased timeout
    await page.getByTestId('message-text').waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.getByTestId('message-text')).toHaveText("Hi, How are you ?");
    
    // Wait for AI response loading state to appear
    await page.getByText('generating response').waitFor({ state: 'visible', timeout: 20000 });
    
    // Wait for AI response loading state to disappear and actual response to appear with extended timeout
    await page.getByText('generating response').waitFor({ state: 'hidden', timeout: 30000 });
    
    // Wait for multiple message elements to exist and verify the last one
    await expect(page.getByTestId('message-text')).toHaveCount(2, { timeout: 20000 });
    await expect(page.getByTestId('message-text').last()).toHaveText("Hello! I'm doing great, thanks for asking 😊 How are you doing today?", { timeout: 5000 });
    await page.getByTestId('sidebar-toggle-button').click();
    await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
    await expect(page.getByTestId('session-item-0')).toContainText('Greetings');
    await page.getByTestId('sidebar-toggle-button').click();
    // Take screenshot after successful chat interaction
    await expect(page).toHaveScreenshot('greet-chat-session-complete.png', { fullPage: true, maxDiffPixelRatio : 0.05 });
  })
  test('Create a new session for generating document', async({ page }) => {
    // Increase timeout for this test due to AI response generation
    test.setTimeout(60000);
    
    await page.getByTestId('iconbar-new-session-button').click();
    await page.getByTestId('floating-dock').waitFor({ state: 'visible' });
    await page.getByTestId('sidebar-toggle-button').click();
    await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
    await expect(page.getByTestId('session-item-0')).toContainText('Untitled Session');
    await page.getByTestId('sidebar-toggle-button').click();
    const input = page.getByTestId('chat-input');
    await input.fill('Write an article about AI');
    test.setTimeout(60000);
    await page.getByTestId('chat-submit-button').click();

    // Wait for user message to appear with increased timeout
    await page.getByTestId('message-text').waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.getByTestId('message-text')).toHaveText("Write an article about AI");
    
    // Wait for AI response loading state to appear
    await page.getByText('generating response').waitFor({ state: 'visible', timeout: 20000 });
    
    // Wait for AI response loading state to disappear and actual response to appear with extended timeout
    await page.getByText('generating response').waitFor({ state: 'hidden', timeout: 30000 });
    
    // Wait for multiple message elements to exist and verify the last one
    await expect(page.getByTestId('message-text')).toHaveCount(2, { timeout: 20000 });
    await expect(page.getByTestId('message-text').last()).toHaveText("Sure! Here's a detailed article about Artificial Intelligence.", { timeout: 5000 });
    await expect(page.getByTestId('message-text').last()).toHaveText("The Future of Artificial Intelligence", { timeout: 5000 });

    //Refer the created document and update the document
    //Type the '/' keyword to open the keyword dropdown
    await page.getByTestId('chat-input').fill('/')
    //Check the keyword dropdown is visible
    expect(page.getByTestId('keyword-dropdown').waitFor({ state: 'visible', timeout : 5000 }));
    await page.getByTestId('chat-keyword-dropdown-document-button').click();
    await page.getByTestId('chat-keyword-dropdown-documents-list').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('reference-document-0').click();
    expect(page.getByTestId('keyword-dropdown').waitFor({ state: 'hidden', timeout : 5000 }));
    await page.getByTestId('chat-keyword-dropdown-documents-list').waitFor({ state: 'hidden', timeout: 5000 });
    await page.getByTestId('chat-referenced-document').waitFor({state : 'visible', timeout : 5000});
    expect(page.getByTestId('chat-input')).toBeVisible();
    await page.getByTestId('chat-input').fill('AI impacts human jobs');
    test.setTimeout(60000);
    await page.getByTestId('chat-submit-button').click();


    // Wait for multiple message elements to exist and verify the last one
    await expect(page.getByTestId('message-text')).toHaveCount(2, { timeout: 20000 });
    await expect(page.getByTestId('message-text').last()).toHaveText("Here's a detailed document exploring how AI affects employment and human roles.", { timeout: 5000 });
    await expect(page.getByTestId('message-text').last()).toHaveText("AI and the Future of Work", { timeout: 5000 });

    await page.getByTestId('sidebar-toggle-button').click();
    await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
    await expect(page.getByTestId('session-item-0')).toContainText('AI Article Request');
    await page.getByTestId('sidebar-toggle-button').click();

    // Take screenshot after successful chat interaction
    await expect(page).toHaveScreenshot('greet-chat-session-complete.png', { fullPage: true, maxDiffPixelRatio : 0.05 });
  })

});