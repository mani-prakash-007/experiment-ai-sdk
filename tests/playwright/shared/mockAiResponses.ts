/**
 * Mock AI responses for testing chat functionality
 */

export interface MockAiResponse {
  general: string;
  title: string;
  document: string;
  extra?: {
    estimatedReadTime?: string;
    tags?: string[];
    category?: string;
  };
}

/**
 * Pre-defined mock responses for specific test scenarios
 */
export const MOCK_AI_RESPONSES: Record<string, MockAiResponse> = {
  "Hi, How are you ?": {
    general: "Hello, I'm fine. What about you? (mocked)",
    title: "",
    document: "",
    extra: undefined
  },
  
  "Write an article about AI": {
    general: "I'll create a comprehensive article about AI for you. (mocked)",
    title: "The Future of Artificial Intelligence",
    document: "<h1>The Future of Artificial Intelligence</h1><p>Artificial Intelligence (AI) has emerged as one of the most transformative technologies of our time...</p><h2>Current Applications</h2><p>AI is currently being used in various industries...</p>",
    extra: {
      estimatedReadTime: "5 minutes",
      tags: ["AI", "Technology", "Future"],
      category: "Technology"
    }
  },
  
  "Create a to-do list": {
    general: "I've created a simple to-do list template for you. (mocked)",
    title: "Daily To-Do List",
    document: "<h1>Daily To-Do List</h1><ul><li><strong>Morning:</strong> Review priorities</li><li><strong>Afternoon:</strong> Complete main tasks</li><li><strong>Evening:</strong> Plan for tomorrow</li></ul>",
    extra: {
      estimatedReadTime: "2 minutes",
      tags: ["Productivity", "Planning"],
      category: "Organization"
    }
  },

  "Create a simple document": {
    general: "I've created a simple document for you.(mocked)",
    title: "Simple Document",
    document: "<h1>Simple Document</h1><p>This is a basic document with some content.</p><p>It contains multiple paragraphs and <strong>formatted text</strong>.</p>",
    extra: {
      estimatedReadTime: "1 minute",
      tags: ["Document", "Template"],
      category: "General"
    }
  },

  "Write a summary": {
    general: "Here's a summary document for you.(mocked)",
    title: "Summary Document",
    document: "<h1>Summary Document</h1><h2>Key Points</h2><ul><li>First important point</li><li>Second important point</li><li>Third important point</li></ul><h2>Conclusion</h2><p>In conclusion, these are the main takeaways.</p>",
    extra: {
      estimatedReadTime: "2 minutes",
      tags: ["Summary", "Overview"],
      category: "Documentation"
    }
  }
};

/**
 * Helper function to find matching mock response
 * Supports both exact matching and fuzzy matching
 */
export function findMockResponse(userMessage: string): MockAiResponse {
  // Direct match first
  if (MOCK_AI_RESPONSES[userMessage]) {
    return MOCK_AI_RESPONSES[userMessage];
  }
  
  // Fuzzy matching for similar prompts
  const lowercaseMessage = userMessage.toLowerCase();
  for (const [key, value] of Object.entries(MOCK_AI_RESPONSES)) {
    if (lowercaseMessage.includes(key.toLowerCase()) || 
        key.toLowerCase().includes(lowercaseMessage)) {
      return value;
    }
  }
  
  // Default response if no match found
  return {
    general: "I understand your request. This is a mock response for testing purposes.(mocked)",
    title: "Test Document",
    document: "<h1>Test Document</h1><p>This is a generic test response. The AI would normally process your request and provide a more specific response.</p>",
    extra: {
      estimatedReadTime: "1 minute",
      tags: ["Test", "Mock"],
      category: "Testing"
    }
  };
}

/**
 * Add a new mock response for testing
 */
export function addMockResponse(prompt: string, response: MockAiResponse): void {
  MOCK_AI_RESPONSES[prompt] = response;
}

/**
 * Get all available mock prompts (useful for test validation)
 */
export function getAvailableMockPrompts(): string[] {
  return Object.keys(MOCK_AI_RESPONSES);
}