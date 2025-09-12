// app/api/chat/route.ts
import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const CanvasDocumentSchema = z.object({
  title: z.string().describe('The title of the document'),
  document: z.string().describe(
   `'The main content for the canvas editor. It should only contain HTML semantic tags. ' +
      'I'm using this to feed it into Canvas Text Editor which has support for rich text edit features such as bold, italic, strike through, underline, h1,h2,h3, quote, code` ),
  general: z.string().describe(
    'Brief summary for chat bubble display with markdown response'
  ),
  extra: z
    .object({
      wordCount: z.number().optional(),
      estimatedReadTime: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages must be provided as an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert to ModelMessage format manually
    const modelMessages = messages.map(msg => {
      // Handle UIMessage format (with parts)
      if (msg.parts && Array.isArray(msg.parts)) {
        const textPart = msg.parts.find(part => part.type === 'text');
        return {
          role: msg.role,
          content: textPart?.text || '',
        };
      }
      return {
        role: msg.role,
        content: msg.content || '',
      };
    });

    const result = streamObject({
      model: google('gemini-1.5-flash'),
      system: `You are an AI assistant that can generate both conversational responses and structured documents.

    DOCUMENT GENERATION RULES:
    - Generate a full document response (with title, document, general, and extra fields) ONLY when the user explicitly requests:
      * Written content creation (articles, essays, reports, guides, tutorials)
      * Document drafting (letters, proposals, documentation)
      * Structured content (lists, outlines, formatted text)
      * Creative writing (stories, poems, scripts)
      
    GENERAL RESPONSE RULES:
    - For all other interactions, provide ONLY a general response:
      * Questions and answers
      * Explanations and clarifications  
      * Conversations and discussions
      * Technical help and troubleshooting
      * Code reviews and suggestions
      * General chat and casual interactions

    When providing a general response:
    - Set document field to an empty string ""
    - Set title field to an empty string ""
    - Focus your content in the general field with markdown formatting
    - Leave extra field empty or undefined

    When generating documents:
    - Provide meaningful title
    - Create rich HTML content for the document field using semantic tags
    - Include a brief summary in the general field
    - Add relevant metadata in the extra field (word count, read time, tags, category)`,
      messages: modelMessages,
      schema: CanvasDocumentSchema,
    });


    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Streaming error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
