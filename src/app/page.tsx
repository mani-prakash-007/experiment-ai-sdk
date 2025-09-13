'use client';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import { User, Bot, FileText, X, Save, Sparkles,   ExternalLink, Image as ImageIcon, Paperclip  } from 'lucide-react';
import { FloatingDock } from '@/components/FloatingDock';
import { Message, ModelOption, UploadedFile } from './types/chat';

// Dynamically import the TipTap editor (client-only)
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

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
  //Ref-Auto Scroll Behaviour
  const containerRef = useRef<HTMLDivElement | null>(null);

  //Input Box States
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
  "id": "gemini-1.5-flash",
  "name": "Gemini 1.5 Flash",
  "provider": "Google"
});

  const [uploadedFile, setUploadedFile] = useState<UploadedFile>();
  
  const { object, submit, isLoading, error } = useObject({
    api: '/api/chat',
    schema: CanvasDocumentSchema,
  });
  const handleFileRemove = () => {
    setUploadedFile(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      file : uploadedFile
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const formattedMessages = newMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      file: msg.file
    }));
    submit({ messages: formattedMessages , model : selectedModel });
    setInput('');
    setUploadedFile(undefined)
  };
  // Scroll to bottom whenever messages change
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top : container.scrollHeight,
        behavior : 'smooth'
      })
    }
  }, [messages]);
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
        setIsEditorOpen(true);
        setActiveDocumentId(aiMessage.id);
        setEditorContent(object.document);
      }
    }
  }, [object, isLoading]);

  const openDocument = (messageId: string, document: Message['document']) => {
    if (document) {
      setIsEditorOpen(true);
      setActiveDocumentId(messageId);
      setEditorContent(document.content);
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

        <div ref={containerRef} className={`h-full ${!isEditorOpen && 'w-[50%]'} flex flex-col justify-between overflow-y-auto relative`}>
        {/* Messages Container */}
          <div className="p-4 space-y-4 mb-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                <div className={`flex-1 max-w-[60%] ${
                  message.role === 'user' ? 'flex justify-end' : ''
                }`}>
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
                    } ${
                      message.document ? 'cursor-pointer hover:shadow-xl transition-shadow hover:border hover:border-white' : ''
                    }`}
                    onClick={() => message.document && openDocument(message.id, message.document)}
                  >
                    {/* Message Content */}
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* File Attachment Section */}
                    {message.file && (
                      <div className="mt-3 pt-2">
                        {/* Image Files */}
                        {message.file.metadata?.type?.startsWith('image/') && (
                          <div className="space-y-2">
                            <img 
                              src={message.file.fileUrl} 
                              alt={message.file.fileName}
                              className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ maxHeight: '300px' }}
                              onClick={() => window.open(message?.file?.fileUrl, '_blank')}
                            />
                            <div className="flex items-center space-x-2 text-xs opacity-75">
                              <ImageIcon className="w-3 h-3" />
                              <span>{message.file.fileName}</span>
                              <span>({(message.file.metadata.size / 1024).toFixed(1)} KB)</span>
                            </div>
                          </div>
                        )}

                        {/* PDF Files */}
                        {message.file.metadata?.type === 'application/pdf' && (
                          <div className="space-y-2 w-[300px]">
                            <div 
                              className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors w-full"
                              onClick={() => window.open(message?.file?.fileUrl, '_blank')}
                            >
                              <div className="flex-shrink-0">
                                <FileText className="w-8 h-8 text-red-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-red-900 truncate">
                                  {message.file.fileName}
                                </p>
                                <p className="text-xs text-red-600">
                                  PDF • {(message.file.metadata.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-red-600" />
                            </div>
                          </div>
                        )}

                        {/* Text Files */}
                        {(message.file.metadata?.type?.startsWith('text/') || 
                          message.file.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i)) && (
                          <div className="space-y-2 w-[300px]">
                            <div 
                              className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                              onClick={() => window.open(message?.file?.fileUrl, '_blank')}
                            >
                              <div className="flex-shrink-0">
                                <FileText className="w-8 h-8 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-green-900 truncate">
                                  {message.file.fileName}
                                </p>
                                <p className="text-xs text-green-600">
                                  Text File • {(message.file.metadata.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-green-600" />
                            </div>
                          </div>
                        )}

                        {/* Generic File Fallback */}
                        {message.file.metadata?.type && 
                        !message.file.metadata.type.startsWith('image/') && 
                        message.file.metadata.type !== 'application/pdf' && 
                        !message.file.metadata.type.startsWith('text/') && 
                        !message.file.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i) && (
                          <div className="space-y-2 w-[300px]">
                            <div 
                              className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => window.open(message?.file?.fileUrl, '_blank')}
                            >
                              <div className="flex-shrink-0">
                                <Paperclip className="w-8 h-8 text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {message.file.fileName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {message.file.metadata.type} • {(message.file.metadata.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Document Section (existing) */}
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
          <div className="sticky bottom-5 mx-10">
          <FloatingDock input={input} onSubmit={handleSubmit} isLoading={isLoading} setInput={setInput} selectedModel={selectedModel} onModelChange={setSelectedModel} uploadedFile={uploadedFile} onFileUpload={setUploadedFile} onFileRemove={handleFileRemove} />
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
                        <div className='flex'>
                        <span className='font-bold pr-2'>Estimated Reading Time :</span>
                        <span> {getActiveDocument()?.extra?.estimatedReadTime}</span>
                        </div>
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
