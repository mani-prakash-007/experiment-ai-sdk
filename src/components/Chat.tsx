'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import { ArrowDown } from 'lucide-react';
import { FloatingDock } from '@/components/FloatingDock';
import { useAuth } from '@/app/hooks/useAuth';
import { useChatSessions } from '@/app/hooks/useChatSessions';
import { useChatMessages } from '@/app/hooks/useChatMessages';
import { Message, ModelOption, UploadedFile } from '@/app/types/chat';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { ChatBubble } from '@/components/ChatBubble';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { notFound } from 'next/navigation';

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
  const params = useParams();
  const activeSessionId = params.sessionId as string | null;

  const { user, loading: authLoading } = useAuth();
  const { sessions, createSession, updateSessionTitle, refreshSessions } = useChatSessions(user?.id);

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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

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
    setStreamingMessageId(null);
    aiSubmittedSession.current = null;
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

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 2000);
  }, [activeSessionId, scrollToBottom]);

  // DOC View Logic
  const openDocument = (messageId: string, document: Message['document']) => {
    if (document) {
      setIsEditorOpen(true);
      setActiveDocumentId(messageId);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setActiveDocumentId(null);
  };

  const updateDocument = (documentContent: EditorDocumentContent) => {
    if (activeDocumentId) {
      const message = messages.find(m => m.id === activeDocumentId);
      if (message?.document) {
        updateMessage(activeDocumentId, {
          document: documentContent
        });
        toast.success('Document Saved');
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

  // STREAMING AI RESPONSE - Open editor immediately and stream content
  useEffect(() => {
    if (
      activeSessionId &&
      aiSubmittedSession.current === activeSessionId &&
      (isLoading || object?.general)
    ) {
      // Open editor immediately when streaming starts
      scrollToBottom();
      if (isLoading && !streamingMessageId) {
        const aiMessage: Omit<Message, 'id' | 'created_at'> = {
          session_id: activeSessionId,
          role: 'assistant',
          content: '',
          document: {
            title: 'Generating Document 📄',
            content: '',
            extra: undefined,
          },
        };
        
        addMessage(aiMessage).then((addedMessage) => {
          if (addedMessage) {
            setActiveDocumentId(addedMessage.id);
            setStreamingMessageId(addedMessage.id);
          }
        });
      }
      
      // Update content during streaming
      if (streamingMessageId && (object?.general || object?.document || object?.title)) {
        const currentContent = object?.general || '';
        const currentDocumentContent = object?.document || '';
        const currentTitle = object?.title || 'Generating Document...';
        
        if (currentDocumentContent) {
          setIsEditorOpen(true);
        }
        
        updateMessage(streamingMessageId, {
          content: currentContent,
          document: {
            title: currentTitle,
            content: currentDocumentContent,
            extra: cleanExtraObject(object?.extra),
          }
        });
      }
      
      // Final cleanup when streaming completes
      if (!isLoading && object?.general && streamingMessageId) {
        setStreamingMessageId(null);
        aiSubmittedSession.current = null;
      }
    }
  }, [object, isLoading, addMessage, updateMessage, messages, activeSessionId, streamingMessageId, scrollToBottom]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
  <div className="flex h-full w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
    {/* 2 COLUMN FLEX */}
    <div className={`flex flex-row h-full w-full transition-all duration-500 ease-in-out`}>
      <div className={`flex flex-col flex-1 min-w-0 h-full`}>
        {activeSessionId ? (
          <div 
            ref={containerRef}
            className="h-full w-full flex flex-col justify-between overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-4 pb-20 max-w-full mt-10">
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
                  <div key={message.id} className="mx-auto max-w-[820px] w-full">
                    <ChatBubble
                      key={message.id}
                      message={message}
                      user={user}
                      onDocumentClick={openDocument}
                    />
                  </div>
                ))}
                {error && (
                  <div className="mx-auto max-w-[720px] w-full">
                    <ChatBubble
                      message={{
                        id: 'error',
                        role: 'assistant',
                        content: error.message,
                        session_id: activeSessionId || '',
                        created_at: new Date().toISOString(),
                      } as Message}
                      user={user}
                      onDocumentClick={openDocument}
                      isError={true}
                    />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-20 right-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors z-30"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            )}
            {/* Updated FloatingDock block below */}
            <div className="flex-shrink-0 p-4 flex justify-center bg-gradient-to-t from-gray-900 to-transparent">
              <div className="w-full max-w-[820px]">
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
          </div>
        ) : (
          <WelcomeScreen createSession={createSession} refreshSessions={refreshSessions}/>
        )}
      </div>
      {/* CANVAS EDITOR AS SIDE COLUMN */}
      <div
        className={`transition-all duration-500 ease-in-out border-l border-gray-600 bg-gray-900 overflow-hidden ${
          isEditorOpen && getActiveDocument()
            ? "w-[clamp(350px,45vw,700px)] min-w-[350px] opacity-100"
            : "w-0 min-w-0 opacity-0"
        }`}
        style={{ boxShadow: isEditorOpen ? "-2px 0 16px rgba(0,0,0,0.12)" : undefined }}
      >
        {isEditorOpen && getActiveDocument() && (
          <CanvasTextEditor
            value={getActiveDocument() as EditorDocumentContent}
            onSave={updateDocument}
            onClose={closeEditor}
            isStreaming={isLoading && streamingMessageId === activeDocumentId}
          />
        )}
      </div>
    </div>
  </div>
);
}
