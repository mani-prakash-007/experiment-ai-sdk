import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';

// Test mode configuration
const IS_TESTING = process.env.NEXT_APP_ENV === 'test';

// Dynamic import for mock functionality (only in test mode)
async function createMockTitleModel(message: string): Promise<LanguageModel> {
  if (!IS_TESTING) {
    throw new Error('Mock model should only be used in test mode');
  }
  
  try {
    // Dynamic import with relative path from src/app/api/generate-title to tests/playwright/shared
    const mockModule = await import('../../../../tests/playwright/shared/mockAiModel');
    return mockModule.createMockTitleModel(message);
  } catch (error) {
    console.error('Failed to import mock title model:', error);
    throw new Error('Mock functionality not available');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ title: 'New Chat Session' });
    }

    // Determine which model to use based on testing mode
    let model: LanguageModel;
    
    if (IS_TESTING) {
      model = await createMockTitleModel(message);
    } else {
      model = google('gemini-2.5-flash-lite');
    }

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: 'Generate a short, descriptive title (max 50 characters) for a chat session based on the user\'s first message. Return only the title, no quotes or extra text. Make it concise and meaningful.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      maxOutputTokens: 20,
    });

    return NextResponse.json({ title: text.trim() });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json({ title: 'Chat Session' });
  }
}
