// app/api/chat/route.ts
import { streamObject, type ModelMessage } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { perplexity } from "@ai-sdk/perplexity";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Type imports for development - these will be tree-shaken in production
import type { LanguageModel } from "ai";

// Schema for the structured response
const CanvasDocumentSchema = z.object({
  general: z
    .string()
    .describe("Brief summary for chat bubble display with markdown response"),
  title: z.string().describe("The title of the document"),
  document: z.string().describe(
    `The main content for the canvas editor. It should only contain HTML semantic tags. ` +
      `I'm using this to feed it into Canvas Text Editor which has support for rich text edit features such as bold, italic, strike through, underline, h1,h2,h3, quote, code`
  ),
  extra: z
    .object({
      estimatedReadTime: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
});

// Test mode configuration
const IS_TESTING = process.env.NEXT_APP_ENV === 'test';

// Dynamic import for mock functionality (only in test mode)
async function createMockModel(userMessage: string): Promise<LanguageModel> {
  if (!IS_TESTING) {
    throw new Error('Mock model should only be used in test mode');
  }
  
  try {
    // Dynamic import with relative path from src/app/api/chat to tests/playwright/shared
    const mockModule = await import('../../../../tests/playwright/shared/mockAiModel');
    return mockModule.createMockAiModel(userMessage);
  } catch (error) {
    console.error('Failed to import mock model:', error);
    throw new Error('Mock functionality not available');
  }
}

interface MessageContentPart {
  type: string;
  text?: string;
  image?: string;
  data?: string;
  mediaType?: string;
}

interface MessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContentPart[];
  documentReference?: { title?: string; content?: string };
  attachments?: Array<{ url: string; contentType?: string }>;
  file?: {
    storagePath: string;
    fileUrl?: string;
    metadata?: {
      type: string;
      originalName?: string;
    };
  };
}

function toModelMessages(messages: MessageInput[]): ModelMessage[] {
  // Your existing toModelMessages implementation
  return messages.map((msg) => {
    if (Array.isArray(msg.content)) {
      return {
        role: msg.role,
        content: msg.content,
      } as ModelMessage;
    }

    // Handle original API message format
    const parts: MessageContentPart[] = [];

    if (msg.documentReference) {
      parts.push({
        type: "text",
        text: `[DOCUMENT TO EDIT - Title: "${msg.documentReference.title || 'Untitled'}"]\n\n${msg.documentReference.content || ''}\n\n[END OF DOCUMENT TO EDIT]\n\nPlease apply the following changes to the above document:`,
      });
    }

    if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
      parts.push({
        type: "text",
        text: msg.content.trim(),
      });
    }

    if (msg.file && msg.file.storagePath) {
      const mime = msg.file.metadata?.type || "";
      const fileUrl = msg.file.fileUrl || msg.file.storagePath;

      if (mime.startsWith("image/")) {
        parts.push({
          type: "image",
          image: fileUrl,
        });
      } else if (mime === "application/pdf") {
        parts.push({
          type: "file",
          data: fileUrl,
          mediaType: mime,
        });
      } else if (
        mime === "text/plain" ||
        mime === "text/markdown" ||
        mime === "application/json" ||
        mime === "text/csv"
      ) {
        parts.push({
          type: "file",
          data: fileUrl,
          mediaType: mime,
        });
      } else {
        parts.push({
          type: "text",
          text: `[File uploaded: ${msg.file.metadata?.originalName || 'Unknown'} (${mime})]`,
        });
      }
    }

    if (parts.length === 0) {
      parts.push({
        type: "text",
        text: "...",
      });
    }

    return {
      role: msg.role,
      content: parts,
    } as ModelMessage;
  });
}

/**
 * Get the appropriate model instance based on provider
 */
function getModelInstance(model: { id: string; name: string; provider: string }): LanguageModel {
  switch (model.provider.toLowerCase()) {
    case "google":
      return google(model.id);
    case "openai":
      return openai(model.id);
    case "perplexity":
      return perplexity(model.id);
    case "anthropic":
      return anthropic(model.id);
    default:
      throw new Error(`Unsupported model provider: ${model.provider}`);
  }
}

/**
 * Extract user message content from messages array for mock testing
 */
function extractUserMessage(messages: any[]): string {
  const lastUserMessage = messages
    .filter(msg => msg.role === 'user')
    .pop();
  
  if (!lastUserMessage) {
    return '';
  }

  if (typeof lastUserMessage.content === 'string') {
    return lastUserMessage.content;
  }
  
  if (Array.isArray(lastUserMessage.content)) {
    const textPart = lastUserMessage.content.find((part: any) => part.type === 'text');
    return textPart?.text || '';
  }
  
  return '';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages must be provided as an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!model || !model.id || !model.provider) {
      return new Response(
        JSON.stringify({
          error: "Model information must be provided with id and provider",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const modelMessages = toModelMessages(messages);

    for (const msg of modelMessages) {
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error(`Invalid message role: ${msg.role}`);
      }
      if (!msg.content) {
        throw new Error('Message content is required');
      }
    }

    // Determine which model to use based on testing mode
    let modelInstance: LanguageModel;
    
    if (IS_TESTING) {
      const userContent = extractUserMessage(messages);
      modelInstance = await createMockModel(userContent);
    } else {
      modelInstance = getModelInstance(model);
    }

    const result = streamObject({
      model: modelInstance,
      system: `You are an AI assistant that can generate both conversational responses and structured documents.

DOCUMENT GENERATION RULES:
- Generate a full document response (with title, document, general, and extra fields) ONLY when the user explicitly requests:
  * Written content creation (articles, essays, reports, guides, tutorials)
  * Document drafting (letters, proposals, documentation)
  * Structured content (lists, outlines, formatted text)
  * Creative writing (stories, poems, scripts)
  
DOCUMENT EDITING RULES:
- When you see "[DOCUMENT TO EDIT]" in the context, this indicates the user wants to edit an existing document
- Apply the requested changes to the provided document while preserving its original structure and intent
- Generate a full document response with the edited content
- Maintain consistency with the original document's style and format
- Focus on making only the requested changes unless broader improvements are explicitly asked for
  
GENERAL RESPONSE RULES:
- For all other interactions, provide ONLY a general response:
  * Questions and answers
  * Explanations and clarifications  
  * Conversations and discussions
  * Technical help and troubleshooting
  * Code reviews and suggestions
  * General chat and casual interactions

FILE HANDLING CAPABILITIES:
- **Images**: Analyze visual content, describe what you see, extract text from images if present
- **PDFs**: Read and analyze PDF content, answer questions about document structure and content
- **Text Files**: Process and analyze text content including code files, documentation, CSV data, JSON, etc.
- Always reference specific details from uploaded files in your responses
- If a file cannot be processed, acknowledge this and ask for clarification

When providing a general response:
- Set document field to an empty string ""
- Set title field to an empty string ""
- Focus your content in the general field with markdown formatting
- Leave extra field empty or undefined

When generating or editing documents:
- Provide meaningful title
- Create rich HTML content for the document field using semantic tags
- Include a brief summary in the general field
- Add relevant metadata in the extra field (estimated read time, tags, category)`,
      messages: modelMessages,
      schema: CanvasDocumentSchema,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Streaming error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
