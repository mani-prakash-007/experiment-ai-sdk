import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ title: 'New Chat Session' });
    }

    const { text } = await generateText({
      model: google('gemini-1.5-pro'),
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
