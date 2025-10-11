import { MockLanguageModelV2 } from "ai/test";
import { simulateReadableStream } from "ai";
import { findMockResponse, generateMockTitle } from "./mockAiResponses";

/**
 * Creates a mock AI model for testing that simulates streaming responses
 */
export function createMockAiModel(userMessage: string): MockLanguageModelV2 {
  const mockResponse = findMockResponse(userMessage);
  
  return new MockLanguageModelV2({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: 100,
        chunkDelayInMs: 50,
        chunks: [
          { type: 'text-start', id: 'text-1' },
          { type: 'text-delta', id: 'text-1', delta: JSON.stringify(mockResponse) },
          { type: 'text-end', id: 'text-1' },
          { 
            type: 'finish', 
            finishReason: 'stop', 
            logprobs: undefined, 
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } 
          },
        ],
      }),
    }),
  });
}

/**
 * Creates a mock AI model for title generation testing
 */
export function createMockTitleModel(message: string): MockLanguageModelV2 {
  const mockTitle = generateMockTitle(message);
  
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      content: [{ type: 'text', text: mockTitle }],
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      warnings: []
    }),
  });
}

/**
 * Extract user message content from a messages array
 * Handles both string content and complex content arrays
 */
export function extractUserMessage(messages: any[]): string {
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