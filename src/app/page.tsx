'use client';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import { User, Bot, FileText, X, Save, Sparkles } from 'lucide-react';

// Dynamically import the TipTap editor (client-only)
const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

// Schema matching your API
const CanvasDocumentSchema = z.object({
  title: z.string(),
  document: z.string(),
  general: z.string(),
  extra: z.object({
    wordCount: z.number().optional(),
    estimatedReadTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  }).optional(),
});

// Infer the type from the schema
type CanvasDocumentType = z.infer<typeof CanvasDocumentSchema>;

interface Message {
  id: string;
  role: string;
  content: string;
  document?: {
    title?: string;
    content: string;
    extra?: {
      wordCount?: number;
      estimatedReadTime?: string;
      tags?: string[];
      category?: string;
    };
  };
}

// Helper function to clean the extra object from PartialObject to proper types
const cleanExtraObject = (extra: any) => {
  if (!extra) return undefined;
  
  return {
    wordCount: extra.wordCount,
    estimatedReadTime: extra.estimatedReadTime,
    // Handle the case where tags might be (string | undefined)[]
    tags: extra.tags ? extra.tags.filter((tag: any) => typeof tag === 'string' && tag !== undefined) : undefined,
    category: extra.category,
  };
};


export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  
  const { object, submit, isLoading, error } = useObject({
    api: '/api/chat',
    schema: CanvasDocumentSchema,
  });

  console.log(messages)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const formattedMessages = newMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    submit({ messages: formattedMessages });
    setInput('');
  };

  // Handle AI response and document creation
  useEffect(() => {
    if (object?.general && !isLoading) {
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: object.general,
        document: object.document ? {
          title: object.title || 'Untitled Document',
          content: object.document,
          extra: cleanExtraObject(object.extra),
        } : undefined,
      };

      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === 'assistant' && lastMessage?.content === object.general) {
          return prev;
        }
        return [...prev, aiMessage];
      });

      // Auto-open editor if document exists
      if (object.document) {
        setActiveDocumentId(aiMessage.id);
        setEditorContent(object.document);
        setIsEditorOpen(true);
      }
    }
  }, [object, isLoading]);

  const openDocument = (messageId: string, document: Message['document']) => {
    if (document) {
      setActiveDocumentId(messageId);
      setEditorContent(document.content);
      setIsEditorOpen(true);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setActiveDocumentId(null);
  };

  const updateDocument = () => {
    if (activeDocumentId) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === activeDocumentId && msg.document
            ? { ...msg, document: { ...msg.document, content: editorContent } }
            : msg
        )
      );
      alert('Document updated successfully');
    }
  };

  const getActiveDocument = () => {
    return messages.find(msg => msg.id === activeDocumentId)?.document;
  };

  return (
    <div className="flex w-screen h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Chat Column */}
      <div className={`h-full flex flex-col transition-all duration-500 ease-in-out ${
        isEditorOpen ? 'w-1/2' : 'w-full'
      } border-r border-gray-700 items-center`}>
        
        {/* Header */}
        <div className="w-full bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Canvas Chat</h1>
              <p className="text-sm text-gray-400">Create and edit documents with AI</p>
            </div>
          </div>
        </div>

        <div className={`h-full ${!isEditorOpen && 'w-[50%]'} flex flex-col justify-between overflow-y-auto relative`}>
        {/* Messages Container */}
          <div className="p-4 space-y-4 ">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                <div className={`flex-1 max-w-[80%] ${
                  message.role === 'user' ? 'flex justify-end' : ''
                }`}>
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
                    } ${
                      message.document ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
                    }`}
                    onClick={() => message.document && openDocument(message.id, message.document)}
                  >
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      {message.content}
                    </div>
                    
                    {message.document && (
                      <div className="mt-2 pt-2 border-t border-gray-600 flex items-center space-x-2 text-xs text-gray-300">
                        <FileText className="w-3 h-3" />
                        <span>Click to view document: {message.document.title || 'Untitled Document'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm">Creating document for you...</span>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-red-900/50 text-red-100 rounded-2xl rounded-bl-md px-4 py-3 border border-red-700">
                  <div className="text-sm font-medium">Error</div>
                  <div className="text-sm opacity-90">{error.message}</div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="p-4 sticky bottom-10 rounded-3xl bg-[#1B2535] border border-blue-500">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <input
                className="flex-1 bg-gray-800 text-gray-100 px-4 py-3 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                value={input}
                placeholder="Ask me to create a document..."
                onChange={e => setInput(e.currentTarget.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              >
                <span>Send</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Document Editor */}
      <div className={`flex flex-col transition-all duration-500 ease-in-out bg-gray-900 ${
        isEditorOpen ? 'w-1/2 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden'
      }`}>
        {isEditorOpen && getActiveDocument() && (
          <>
            <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">
                    {getActiveDocument()?.title || 'Untitled Document'}
                  </h2>
                  {getActiveDocument()?.extra && (
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                      {getActiveDocument()?.extra?.estimatedReadTime && (
                        <span>{getActiveDocument()?.extra?.estimatedReadTime}</span>
                      )}
                      {getActiveDocument()?.extra?.wordCount && (
                        <span>{getActiveDocument()?.extra?.wordCount} words</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={updateDocument}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Update</span>
                  </button>
                  <button
                    onClick={closeEditor}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {getActiveDocument()?.extra && (getActiveDocument()?.extra?.tags || getActiveDocument()?.extra?.category) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {getActiveDocument()?.extra?.category && (
                    <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full">
                      {getActiveDocument()?.extra?.category}
                    </span>
                  )}
                  {getActiveDocument()?.extra?.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              <RichTextEditor 
                input={editorContent} 
                setInput={setEditorContent}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
