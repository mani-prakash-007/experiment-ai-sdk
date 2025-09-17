'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import {
  User, Bot, FileText, ExternalLink,
  Image as ImageIcon, Paperclip, Menu, Plus, ArrowDown, MessageSquare
} from 'lucide-react';
import { FloatingDock } from '@/components/FloatingDock';
import { ChatSidebar } from '@/components/ChatSidebar';
import { useAuth } from '@/app/hooks/useAuth';
import { useChatSessions } from '@/app/hooks/useChatSessions';
import { useChatMessages } from '@/app/hooks/useChatMessages';
import { Message, ModelOption, UploadedFile } from '@/app/types/chat';
import { toast } from 'sonner';

const CanvasTextEditor = dynamic(() => import('@/components/CanvasTextEditor'), { ssr: false });

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

type EditorDocumentContent = {
  title: string;
  extra: {
    estimatedReadTime?: string;
    category?: string;
    tags?: string[];
  };
  content: string;
};

const cleanExtraObject = (extra: any) => {
  if (!extra) return undefined;
  return {
    wordCount: extra.wordCount,
    estimatedReadTime: extra.estimatedReadTime,
    tags: extra.tags ? extra.tags.filter((tag: any) => typeof tag === 'string' && tag !== undefined) : undefined,
    category: extra.category,
  };
};

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const {
    sessions,
    loading: sessionsLoading,
    createSession,
    deleteSession,
    updateSessionTitle
  } = useChatSessions(user?.id);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google'
  });
  const [uploadedFile, setUploadedFile] = useState<UploadedFile>();
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Session-specific AI result context
  const aiSubmittedSession = useRef<string | null>(null);

  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadMoreMessages,
    addMessage,
    updateMessage
  } = useChatMessages({ sessionId: activeSessionId });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { object, submit, isLoading, error } = useObject({
    api: '/api/chat',
    schema: CanvasDocumentSchema,
  });

  // Always clear all session-specific state BEFORE switching session
  const clearSessionState = () => {
    setInput('');
    setUploadedFile(undefined);
    setIsEditorOpen(false);
    setActiveDocumentId(null);
    aiSubmittedSession.current = null; // Also clear pending AI trigger
  };

  // For new session creation
  const handleNewSession = async () => {
    clearSessionState();
    const newSessionId = await createSession();
    if (newSessionId) {
      setActiveSessionId(newSessionId);
    }
    toast.success('New session created')
  };

  // For session tab selection
  const handleSessionSelect = (sessionId: string) => {
    if (sessionId !== activeSessionId) {
      clearSessionState();
      setActiveSessionId(sessionId);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      clearSessionState();
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
     toast.success('Session deleted')
  };

  const generateSessionTitle = async (firstMessage: string) => {
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: firstMessage }),
      });
      if (response.ok) {
        const { title } = await response.json();
        return title;
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }
    return null;
  };

  const handleFileRemove = () => setUploadedFile(undefined);

  // Always clear editor/input/etc when session changes (extra guard)
  useEffect(() => {
    clearSessionState();
  }, [activeSessionId]);


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);


  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
    if (container.scrollTop === 0 && hasMore && !messagesLoading) {
      const oldScrollHeight = container.scrollHeight;
      loadMoreMessages();
      setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - oldScrollHeight;
      }, 100);
    }
  }, [hasMore, messagesLoading, loadMoreMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId || messagesLoading) return;

    const userMessage: Omit<Message, 'id' | 'created_at'> = {
      session_id: activeSessionId,
      role: 'user',
      content: input,
      file_data: uploadedFile
    };

    setInput('');
    setUploadedFile(undefined);

    const addedMessage = await addMessage(userMessage);
    if (!addedMessage) return;

    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession?.title === 'Untitled Session' && messages.length === 0) {
      const generatedTitle = await generateSessionTitle(input);
      if (generatedTitle) {
        await updateSessionTitle(activeSessionId, generatedTitle);
      }
    }

    let contextToSend: any[];
    if (messages.length === 0) {
      contextToSend = [{
        role: addedMessage.role,
        content: addedMessage.content,
        file: addedMessage.file_data
      }];
    } else {
      contextToSend = [...messages, addedMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
        file: msg.file_data
      }));
    }
    aiSubmittedSession.current = activeSessionId;
    submit({ messages: contextToSend, model: selectedModel });
  };

  // ====== DOC View Logic (no change)
  const openDocument = (messageId: string, document: Message['document']) => {
    if (document) {
      setIsEditorOpen(true);
      setActiveDocumentId(messageId);
      scrollToBottom()
    }
  };
  const closeEditor = () => {
    setIsEditorOpen(false);
    setActiveDocumentId(null);
    scrollToBottom()
  };
  const updateDocument = ( documentContent: EditorDocumentContent) => {
    if (activeDocumentId) {
      const message = messages.find(m => m.id === activeDocumentId);
      if (message?.document) {
        updateMessage(activeDocumentId, {
          document: documentContent
        });
        toast.success('Document Saved')
      }
    }
  };
  const getActiveDocument = () =>
    messages.find(msg => msg.id === activeDocumentId)?.document;


  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom , isEditorOpen]);

  //ASSISTANT (AI) RESPONSE SESSION SAFE
  useEffect(() => {
    // Only add AI response if it belongs to the session that submitted
    if (
      object?.general &&
      !isLoading &&
      activeSessionId &&
      aiSubmittedSession.current === activeSessionId
    ) {
      // Prevent adding same response twice for same session
      const recentAssistant = messages?.findLast
        ? messages.findLast(m => m.role === 'assistant')
        : ([...messages].reverse().find(m => m.role === 'assistant'));
      if (
        recentAssistant &&
        recentAssistant.content === object.general
      ) return;

      const aiMessage: Omit<Message, 'id' | 'created_at'> = {
        session_id: activeSessionId,
        role: 'assistant',
        content: object.general,
        document: object.document
          ? {
              title: object.title || 'Untitled Document',
              content: object.document,
              extra: cleanExtraObject(object.extra),
            }
          : undefined,
      };
      addMessage(aiMessage).then((addedMessage) => {
        if (addedMessage && object.document) {
          setIsEditorOpen(true);
          setActiveDocumentId(addedMessage.id);
        }
      });
      // After processing, clear marker so AI reply isn't processed again
      aiSubmittedSession.current = null;
    }
    // eslint-disable-next-line
  }, [object?.general, isLoading, addMessage, messages, activeSessionId]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-screen h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 fixed">
      {
        user && 
        <ChatSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sessions={sessions}
          user={user}
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onSessionDelete={handleSessionDelete}
          loading={sessionsLoading}
      />
      }
      <div className={`h-full flex flex-col transition-all duration-500 ease-in-out
        ${isEditorOpen ? 'w-1/2' : 'w-full'}
        ${sidebarOpen ? '' : 'lg:ml-0'}`}>
        <div className={`fixed z-50 flex flex-col space-y-3 ml-5 mt-2`}>
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Open Sidebar"
            className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={handleNewSession}
            aria-label="New Session"
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {activeSessionId ? (
          <div 
            ref={containerRef}
            className={`h-full ${!isEditorOpen && 'max-w-4xl mx-auto w-full'} flex flex-col justify-between overflow-y-auto relative pt-14 `}
          >
            <div className="p-4 space-y-4 mb-5">
              {hasMore && messages.length > 0 && (
                <div className="text-center py-2">
                  <button
                    onClick={loadMoreMessages}
                    disabled={messagesLoading}
                    className="text-blue-400 hover:text-blue-300 text-sm px-4 py-2 rounded-lg border border-blue-400/30 hover:border-blue-300/50 transition-colors disabled:opacity-50"
                  >
                    {messagesLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 inline-block mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Load older messages'
                    )}
                  </button>
                </div>
              )}
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
                  <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
                      } ${message.document ? 'cursor-pointer hover:shadow-xl transition-shadow hover:border-white/50' : ''}`}
                      onClick={() => message.document && openDocument(message.id, message.document)}
                    >
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                        {message.content}
                      </div>
                      {message.file_data && (
                        <div className="mt-3 pt-2">
                          {/* Image Files */}
                          {message.file_data.metadata?.type?.startsWith('image/') && (
                            <div className="space-y-2">
                              <img 
                                src={message.file_data.fileUrl} 
                                alt={message.file_data.fileName}
                                className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '300px' }}
                                onClick={() => window.open(message.file_data?.fileUrl, '_blank')}
                              />
                              <div className="flex items-center space-x-2 text-xs opacity-75">
                                <ImageIcon className="w-3 h-3" />
                                <span>{message.file_data.fileName}</span>
                                <span>({(message.file_data.metadata.size / 1024).toFixed(1)} KB)</span>
                              </div>
                            </div>
                          )}
                          {/* PDF Files */}
                          {message.file_data.metadata?.type === 'application/pdf' && (
                            <div className="space-y-2 max-w-[300px]">
                              <div 
                                className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors w-full"
                                onClick={() => window.open(message.file_data?.fileUrl, '_blank')}
                              >
                                <div className="flex-shrink-0">
                                  <FileText className="w-8 h-8 text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-red-900 truncate">
                                    {message.file_data.fileName}
                                  </p>
                                  <p className="text-xs text-red-600">
                                    PDF • {(message.file_data.metadata.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-red-600" />
                              </div>
                            </div>
                          )}
                          {/* Text Files */}
                          {(message.file_data.metadata?.type?.startsWith('text/') || 
                            message.file_data.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i)) && (
                            <div className="space-y-2 max-w-[300px]">
                              <div 
                                className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                                onClick={() => window.open(message.file_data?.fileUrl, '_blank')}
                              >
                                <div className="flex-shrink-0">
                                  <FileText className="w-8 h-8 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-900 truncate">
                                    {message.file_data.fileName}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    Text File • {(message.file_data.metadata.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-green-600" />
                              </div>
                            </div>
                          )}
                          {/* Generic File Fallback */}
                          {message.file_data.metadata?.type && 
                          !message.file_data.metadata.type.startsWith('image/') && 
                          message.file_data.metadata.type !== 'application/pdf' && 
                          !message.file_data.metadata.type.startsWith('text/') && 
                          !message.file_data.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i) && (
                            <div className="space-y-2 max-w-[300px]">
                              <div 
                                className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => window.open(message.file_data?.fileUrl, '_blank')}
                              >
                                <div className="flex-shrink-0">
                                  <Paperclip className="w-8 h-8 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {message.file_data.fileName}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {message.file_data.metadata.type} • {(message.file_data.metadata.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-600" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
              <div ref={messagesEndRef} />
            </div>
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-20 right-10 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors z-30"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            )}
            <div className="sticky bottom-0 p-4">
              <FloatingDock
                input={input}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                setInput={setInput}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                uploadedFile={uploadedFile}
                onFileUpload={setUploadedFile}
                onFileRemove={handleFileRemove}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center max-w-md mx-auto p-8">
              <MessageSquare className="w-20 h-20 mx-auto mb-6 opacity-50" />
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to AI Canvas Chat</h2>
              <p className="text-lg mb-6">Start a conversation with AI that can generate and edit documents in real-time.</p>
              <button
                onClick={handleNewSession}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Start New Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>
        <div className={`flex flex-col transition-all duration-500 ease-in-out border border-gray-600 rounded-lg bg-gray-900 ${
          isEditorOpen ? 'w-1/2 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden'
        }`}>
          {getActiveDocument() && (
            <CanvasTextEditor
              value={getActiveDocument() as EditorDocumentContent}
              onSave={updateDocument}
              onClose={closeEditor}
            />
          )}
        </div>
    </div>
  );
}
