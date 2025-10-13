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

  test('Create a new session for simple response', async({ page }) => {
    const sessionButton = page.getByTestId('iconbar-new-session-button')
    await page.waitForTimeout(1000)
    expect(sessionButton).toBeEnabled()
    await sessionButton.click()
    await page.getByTestId('floating-dock').waitFor({ state: 'visible' });
    await page.getByTestId('sidebar-toggle-button').click();
    await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
    await expect(page.getByTestId('session-item-0')).toContainText('Untitled Session');
    await page.getByTestId('sidebar-toggle-button').click();
   
    const input = page.getByTestId('chat-input');
    await input.fill('Hi, How are you ?');
    const button = page.getByText('send')
    expect(button).toBeEnabled();
    await page.waitForTimeout(1000)
    await button.click();
    await page.waitForTimeout(1000)

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
    await expect(page).toHaveScreenshot('simple-chat-session-complete.png', { fullPage: true, maxDiffPixelRatio : 0.05 });
  })
  test('Create a new session for document response', async({ page }) => {

    const sessionButton = page.getByTestId('iconbar-new-session-button');
    await page.waitForTimeout(1000)
    expect(sessionButton).toBeEnabled()
    await sessionButton.click()
    await page.getByTestId('floating-dock').waitFor({ state: 'visible' });
    await page.getByTestId('sidebar-toggle-button').click();
    await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
    await expect(page.getByTestId('session-item-0')).toContainText('Untitled Session');
    await page.getByTestId('sidebar-toggle-button').click();
    const input = page.getByTestId('chat-input');
    await input.fill('Write an article about AI');

    const button = page.getByText('send')
    expect(button).toBeEnabled();
    await page.waitForTimeout(1000)
    await button.click();
    await page.waitForTimeout(1000)


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
    await expect(page.getByTestId('document-title').first()).toHaveText("The Future of Artificial Intelligence", { timeout: 5000 });

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

    expect(button).toBeEnabled();
    await page.waitForTimeout(1000)
    await button.click();
    await page.waitForTimeout(1000)

    // Wait for user message to appear with increased timeout
    await page.getByTestId('message-text').nth(2).waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.getByTestId('message-text').nth(2)).toHaveText("AI impacts human jobs");
    
    // Wait for AI response loading state to appear
    await page.getByText('generating response').waitFor({ state: 'visible', timeout: 20000 });
    
    // Wait for AI response loading state to disappear and actual response to appear with extended timeout
    await page.getByText('generating response').waitFor({ state: 'hidden', timeout: 30000 });

    // Wait for all 4 message elements to exist and verify each one
    await expect(page.getByTestId('message-text')).toHaveCount(4, { timeout: 20000 });
    await expect(page.getByTestId('message-text').nth(0)).toHaveText("Write an article about AI");
    await expect(page.getByTestId('message-text').nth(1)).toHaveText("Sure! Here's a detailed article about Artificial Intelligence.", { timeout: 5000 });
    await expect(page.getByTestId('message-text').nth(2)).toHaveText("AI impacts human jobs");
    await expect(page.getByTestId('message-text').nth(3)).toHaveText("Here's a detailed document exploring how AI affects employment and human roles.", { timeout: 5000 });
    await expect(page.getByTestId('document-title').last()).toHaveText("AI and the Future of Work", { timeout: 5000 });

    await page.getByTestId('sidebar-toggle-button').click();
    await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
    await expect(page.getByTestId('session-item-0')).toContainText('AI Article Request');
    await page.getByTestId('sidebar-toggle-button').click();

    await expect(page.getByTestId('canvas-text-editor-component')).toBeVisible();
    const textEditorCloseButton = page.getByTestId('canvas-text-editor-close-button');
    await textEditorCloseButton.click();

    // Take screenshot after successful chat interaction
    await expect(page).toHaveScreenshot('document-chat-session-complete.png', { fullPage: true, maxDiffPixelRatio : 0.05 });
  })
    test('Create a new session for Markdown Response', async({ page }) => {
      const sessionButton = page.getByTestId('iconbar-new-session-button')
      await page.waitForTimeout(1000)
      expect(sessionButton).toBeEnabled()
      await sessionButton.click()
      await page.getByTestId('floating-dock').waitFor({ state: 'visible' });
      await page.getByTestId('sidebar-toggle-button').click();
      await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
      await expect(page.getByTestId('session-item-0')).toContainText('Untitled Session');
      await page.getByTestId('sidebar-toggle-button').click();
     
      const input = page.getByTestId('chat-input');
      await input.fill('Explain quantum computing ?');
      const button = page.getByText('send')
      expect(button).toBeEnabled();
      await page.waitForTimeout(1000)
      await button.click();
      await page.waitForTimeout(1000)

      // Wait for user message to appear with increased timeout
      await page.getByTestId('message-text').waitFor({ state: 'visible', timeout: 20000 });
      await expect(page.getByTestId('message-text')).toHaveText("Explain quantum computing ?");
      
      // Wait for AI response loading state to appear
      await page.getByText('generating response').waitFor({ state: 'visible', timeout: 20000 });
      
      // Wait for AI response loading state to disappear and actual response to appear with extended timeout
      await page.getByText('generating response').waitFor({ state: 'hidden', timeout: 30000 });
      
      // Wait for multiple message elements to exist and verify key content parts
      await expect(page.getByTestId('message-text')).toHaveCount(2, { timeout: 20000 });
      const aiResponse = page.getByTestId('message-text').last();
      await expect(aiResponse).toContainText('Quantum Computing');
      await expect(aiResponse).toContainText('quantum mechanics');
      await expect(aiResponse).toContainText('Superposition');
      await expect(aiResponse).toContainText('Entanglement');
      await expect(aiResponse).toContainText('Quantum Gates');
      
      await page.getByTestId('sidebar-toggle-button').click();
      await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
      await expect(page.getByTestId('session-item-0')).toContainText('Quantum Computing');
      await page.getByTestId('sidebar-toggle-button').click();
      // Take screenshot after successful chat interaction
      await expect(page).toHaveScreenshot('markdown-chat-session-complete.png', { fullPage: true, maxDiffPixelRatio : 0.05 });
    })
    test('Create a new session for File attachment', async({ page }) => {

      //Spot session creation button
      const sessionButton = page.getByTestId('iconbar-new-session-button')
      await page.waitForTimeout(1000)
      expect(sessionButton).toBeEnabled()
      //Click the session creation Button
      await sessionButton.click()

      //Wait until floating dock is visible
      await page.getByTestId('floating-dock').waitFor({ state: 'visible' });
      await page.getByTestId('sidebar-toggle-button').click();
      await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
      await expect(page.getByTestId('session-item-0')).toContainText('Untitled Session');
      await page.getByTestId('sidebar-toggle-button').click();
     
      //Attach the Image file
      const uploadFileButton = page.getByTestId('chat-upload-selection-button');
      await uploadFileButton.click();
      //Wait for upload dropdown to be visible
      await page.getByTestId('chat-upload-dropdown-list').waitFor({ state: 'visible' });
      const imageUploadButton = page.getByTestId('chat-upload-image-button');
      
      // Set up file chooser before clicking the button
      const fileChooserPromise = page.waitForEvent('filechooser');
      await imageUploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      // Use an actual image file path - you'll need to place this in your test fixtures
      await fileChooser.setFiles('tests/playwright/shared/files/sample-image-amazon.png');
      
      // Wait for file to be uploaded and displayed
      await page.getByTestId('chat-uploaded-file').waitFor({ state: 'visible' });
      

      //Add input to the dock
      const input = page.getByTestId('chat-input');
      await input.fill('Explain what is in this image file');
      const button = page.getByText('send')
      expect(button).toBeEnabled();
      await page.waitForTimeout(1000)
      await button.click();
      await page.waitForTimeout(1000)

      // Wait for user message to appear with increased timeout
      await page.getByTestId('message-text').waitFor({ state: 'visible', timeout: 20000 });
      await expect(page.getByTestId('message-text')).toHaveText("Explain what is in this image file");
      expect(page.getByTestId('file-attachment').nth(0).waitFor({ state : 'visible'}));
      
      // Wait for AI response loading state to appear
      await page.getByText('generating response').waitFor({ state: 'visible', timeout: 20000 });
      
      // Wait for AI response loading state to disappear and actual response to appear with extended timeout
      await page.getByText('generating response').waitFor({ state: 'hidden', timeout: 30000 });
      
    // Wait for multiple message elements to exist and verify the last one
      await expect(page.getByTestId('message-text')).toHaveCount(2, { timeout: 20000 });
      await expect(page.getByTestId('message-text').last()).toHaveText("The image you uploaded contains the Amazon logo. It features the word “amazon” written in a bold, black lowercase font. Below the text, there’s a yellow curved arrow that starts from the letter “a” and points to the letter “z,” symbolizing that Amazon offers everything from A to Z. The arrow also resembles a smile, representing customer satisfaction.", { timeout: 5000 });


      //Attach the PDF file
      await uploadFileButton.click();
      //Wait for upload dropdown to be visible
      await page.getByTestId('chat-upload-dropdown-list').waitFor({ state: 'visible' });
      
      // Set up file chooser before clicking the button
      const fileChooserPromisePDF = page.waitForEvent('filechooser');
      const pdfUploadButton = page.getByTestId('chat-upload-pdf-button');
      await pdfUploadButton.click();
      const fileChooserPDF = await fileChooserPromisePDF;
      
      // Use an actual image file path - you'll need to place this in your test fixtures
      await fileChooserPDF.setFiles('tests/playwright/shared/files/sample-pdf.pdf');
      
      // Wait for file to be uploaded and displayed
      await page.getByTestId('chat-uploaded-file').waitFor({ state: 'visible' });
      

      //Add input to the dock
      await input.fill('Explain what is in this pdf file');
      expect(button).toBeEnabled();
      await page.waitForTimeout(1000)
      await button.click();
      await page.waitForTimeout(1000)

      // Wait for user message to appear with increased timeout
      await expect(page.getByTestId('message-text')).toHaveCount(3, { timeout: 20000 });
      await expect(page.getByTestId('message-text').last()).toHaveText("Explain what is in this pdf file");
      expect(page.getByTestId('file-attachment').nth(1).waitFor({ state : 'visible'}));
      
      // Wait for AI response loading state to appear
      await page.getByText('generating response').waitFor({ state: 'visible', timeout: 20000 });
      
      // Wait for AI response loading state to disappear and actual response to appear with extended timeout
      await page.getByText('generating response').waitFor({ state: 'hidden', timeout: 30000 });
      
    // Wait for multiple message elements to exist and verify the last one
      await expect(page.getByTestId('message-text')).toHaveCount(4, { timeout: 20000 });
      await expect(page.getByTestId('message-text').last()).toHaveText("The PDF file is an informational document from Smallpdf, introducing its digital document management platform. It highlights the platform’s ability to upload, organize, and share files easily. It also mentions that enabling the “Storage” option allows users to store all processed files securely, accessible across devices including computers, phones, and tablets. Additionally, it explains that Smallpdf provides tools to convert, compress, or modify documents, and offers features such as e-signatures, large file sharing, and G Suite integration for organizations. The document concludes by encouraging users to explore these features through links to Smallpdf’s preferences, download page, and Chrome extension.", { timeout: 5000 });


      //Attach the PDF file
      await uploadFileButton.click();
      //Wait for upload dropdown to be visible
      await page.getByTestId('chat-upload-dropdown-list').waitFor({ state: 'visible' });
      
      // Set up file chooser before clicking the button
      const fileChooserPromiseText = page.waitForEvent('filechooser');
      const textUploadButton = page.getByTestId('chat-upload-text-button');
      await textUploadButton.click();
      const fileChooserText = await fileChooserPromiseText;
      
      // Use an actual image file path - you'll need to place this in your test fixtures
      await fileChooserText.setFiles('tests/playwright/shared/files/sample-text.txt');

      // Wait for file to be uploaded and displayed
      await page.getByTestId('chat-uploaded-file').waitFor({ state: 'visible' });
      

      //Add input to the dock
      await input.fill('Explain what is in this text file');
      expect(button).toBeEnabled();
      await page.waitForTimeout(1000)
      await button.click();
      await page.waitForTimeout(1000)

      // Wait for user message to appear with increased timeout
      await expect(page.getByTestId('message-text')).toHaveCount(5, { timeout: 20000 });
      await expect(page.getByTestId('message-text').last()).toHaveText("Explain what is in this text file");
      expect(page.getByTestId('file-attachment').nth(2).waitFor({ state : 'visible'}));
      
      // Wait for AI response loading state to appear
      await page.getByText('generating response').waitFor({ state: 'visible', timeout: 20000 });
      
      // Wait for AI response loading state to disappear and actual response to appear with extended timeout
      await page.getByText('generating response').waitFor({ state: 'hidden', timeout: 30000 });
      
    // Wait for multiple message elements to exist and verify the last one
      await expect(page.getByTestId('message-text')).toHaveCount(6, { timeout: 20000 });
      await expect(page.getByTestId('message-text').last()).toHaveText("The text file contains a short sample paragraph using the classic filler text “Lorem ipsum dolor sit amet…”, which is commonly used for layout and formatting tests. It’s followed by another line that states the file is provided by Sample-Files.com, inviting users to visit the site for additional sample files and resources. In essence, this is a placeholder text file meant to demonstrate or test text-related functionality, such as file upload, formatting, or text parsing in applications.", { timeout: 5000 });


      //Check Session title changed based on the query
      await page.getByTestId('sidebar-toggle-button').click();
      await page.getByTestId('expanded-sidebar-content').waitFor({ state: 'visible' });
      await expect(page.getByTestId('session-item-0')).toContainText('File Explanation');
      await page.getByTestId('sidebar-toggle-button').click();
      // Take screenshot after successful chat interaction
      await expect(page).toHaveScreenshot('file-chat-session-complete.png', { fullPage: true, maxDiffPixelRatio : 0.05 });
    })
});