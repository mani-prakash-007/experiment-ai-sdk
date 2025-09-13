// app/api/chat/route.ts
import { streamObject, type ModelMessage } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { perplexity } from "@ai-sdk/perplexity";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const CanvasDocumentSchema = z.object({
  title: z.string().describe("The title of the document"),
  document: z.string().describe(
    `The main content for the canvas editor. It should only contain HTML semantic tags. ` +
      `I'm using this to feed it into Canvas Text Editor which has support for rich text edit features such as bold, italic, strike through, underline, h1,h2,h3, quote, code`
  ),
  general: z
    .string()
    .describe("Brief summary for chat bubble display with markdown response"),
  extra: z
    .object({
      estimatedReadTime: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
});

function toModelMessages(messages: any[]): ModelMessage[] {
  return messages.map((msg) => {
    // Handle messages that already have content array structure
    if (Array.isArray(msg.content)) {
      return {
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      };
    }

    // Handle original API message format
    const parts: any[] = [];

    // Add text content if present
    if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
      parts.push({
        type: "text",
        text: msg.content.trim(),
      });
    }

    // Add file if present
    if (msg.file && msg.file.fileUrl) {
      const mime = msg.file.metadata?.type || "";

      if (mime.startsWith("image/")) {
        parts.push({
          type: "image",
          image: msg.file.fileUrl, // Direct URL string, not object
        });
      } else if (mime === "application/pdf") {
        parts.push({
          type: "file",
          data: msg.file.fileUrl,
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
          data: msg.file.fileUrl,
          mediaType: mime,
        });
      } else {
        // Fallback: add as text description
        parts.push({
          type: "text",
          text: `[File uploaded: ${msg.file.metadata?.originalName || 'Unknown'} (${mime})]`,
        });
      }
    }

    // Ensure we have at least one content part
    if (parts.length === 0) {
      parts.push({
        type: "text",
        text: "...", // Fallback for empty messages
      });
    }

    return {
      role: msg.role as "user" | "assistant" | "system",
      content: parts,
    };
  });
}

// Helper function to get the appropriate model based on provider
function getModelInstance(model: { id: string; name: string; provider: string }) {
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

    // Convert to ModelMessage format
    const modelMessages = toModelMessages(messages);

    // Validate that we have proper ModelMessage format
    for (const msg of modelMessages) {
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error(`Invalid message role: ${msg.role}`);
      }
      if (!msg.content) {
        throw new Error('Message content is required');
      }
    }

    // Get model instance
    const modelInstance = getModelInstance(model);

    const result = streamObject({
      model: modelInstance,
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

When generating documents:
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
