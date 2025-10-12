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
  // ─────────────────────────────
  // 💬 Greeting Session
  // ─────────────────────────────
  "Hi, How are you ?": {
    general: "Hello! I'm doing great, thanks for asking 😊 How are you doing today? ",
    title: "",
    document: "",
    extra: undefined
  },

  // ─────────────────────────────
  // 📄 Document Sessions
  // ─────────────────────────────
  "Write an article about AI": {
    general: "Sure! Here's a detailed article about Artificial Intelligence.",
    title: "The Future of Artificial Intelligence",
    document: `
      <h1>The Future of Artificial Intelligence</h1>
      <p>Artificial Intelligence (AI) is transforming every aspect of human life — from healthcare and finance to education and entertainment. As computing power grows and data becomes abundant, AI continues to evolve from simple automation to sophisticated reasoning systems.</p>
      
      <h2>What is AI?</h2>
      <p>AI refers to the simulation of human intelligence in machines programmed to think, learn, and make decisions. Modern AI systems are capable of natural language understanding, image recognition, and even creative writing.</p>

      <h2>Current Applications</h2>
      <ul>
        <li><strong>Healthcare:</strong> AI assists in diagnostics, drug discovery, and personalized treatment.</li>
        <li><strong>Finance:</strong> Algorithms predict market trends and detect fraudulent transactions.</li>
        <li><strong>Education:</strong> Intelligent tutoring systems adapt lessons to individual student needs.</li>
      </ul>

      <h2>Ethical Concerns</h2>
      <p>Despite its benefits, AI poses challenges around bias, transparency, and job displacement. Ensuring responsible AI development is essential to maintain fairness and accountability.</p>

      <h2>The Road Ahead</h2>
      <p>In the future, AI will continue to augment human capabilities rather than replace them. The combination of human intuition and machine intelligence will define the next industrial revolution.</p>
    `,
    extra: {
      estimatedReadTime: "6 minutes",
      tags: ["AI", "Machine Learning", "Technology"],
      category: "Technology"
    }
  },

  "AI impacts human jobs": {
    general: "Here's a detailed document exploring how AI affects employment and human roles.",
    title: "AI and the Future of Work",
    document: `
      <h1>AI and the Future of Work</h1>
      <p>Artificial Intelligence is reshaping the global workforce. Automation and machine learning are changing how businesses operate, affecting both blue-collar and white-collar jobs.</p>

      <h2>Automation and Productivity</h2>
      <p>AI-driven automation enhances productivity by handling repetitive and data-intensive tasks. This allows humans to focus on strategy, creativity, and emotional intelligence — areas where machines still fall short.</p>

      <h2>New Job Opportunities</h2>
      <p>While AI eliminates certain roles, it also creates new ones in data analysis, AI ethics, and software development. Entirely new industries are emerging around AI infrastructure, model training, and automation design.</p>

      <h2>Reskilling the Workforce</h2>
      <p>Governments and corporations are investing in upskilling programs to prepare employees for an AI-driven economy. Skills like problem-solving, communication, and adaptability remain essential.</p>

      <h2>Conclusion</h2>
      <p>The future of work is not man <em>versus</em> machine — it’s man <strong>with</strong> machine. Collaboration between humans and AI will define the next era of innovation.</p>
    `,
    extra: {
      estimatedReadTime: "5 minutes",
      tags: ["AI", "Jobs", "Future of Work", "Automation"],
      category: "Technology"
    }
  },
  // ─────────────────────────────
  // 🧠 Markdown Sessions
  // ─────────────────────────────
  "Explain quantum computing ?": {
    document: '',
    title: "",
    general: `
# Quantum Computing  

Quantum computing leverages **quantum mechanics** to process information in fundamentally new ways. Instead of using bits (0 or 1), quantum computers use *qubits*, which can represent both at once.  

---

## 🔑 Key Concepts

### 1. Superposition  
A qubit can exist in multiple states simultaneously, allowing parallel computations.  

### 2. Entanglement  
Two qubits can become linked so that changing one affects the other, no matter the distance.  

### 3. Quantum Gates  
Quantum operations that manipulate qubits, similar to logic gates in classical computing.  

---

## ⚙️ Why It Matters
Quantum computing promises exponential speedups in solving problems like:
- Cryptography and factorization  
- Protein folding in biology  
- Financial modeling  

\`\`\`js
// Example (mock)
const qubit = new Qubit();
qubit.superpose();
qubit.measure(); // returns 0 or 1
\`\`\`

> 💡 *In short:* Quantum computing redefines what's computationally possible.
    `,
    extra: undefined
  },
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
    general: "I understand your request. This is a mock response for testing purposes.",
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

/**
 * Mock title generation responses for testing
 */
export const MOCK_TITLE_RESPONSES: Record<string, string> = {
  //Greeting  - Simple Message Session
  "Hi, How are you ?": "Greetings",
  //AI Article Request - Document Creation Session
  "Write an article about AI": "AI Article Request",
  //Questions - Markdown Response  session
  "Explain quantum computing ?": "Quantum Computing",
};

/**
 * Generate a mock title for a given user message
 * Uses predefined responses or generates a generic title
 */
export function generateMockTitle(message: string): string {
  if (!message || message.trim() === '') {
    return 'New Chat Session';
  }
  
  if (MOCK_TITLE_RESPONSES[message]) {
    return MOCK_TITLE_RESPONSES[message];
  }
  
  return 'Chat Session';
}