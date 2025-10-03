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
import { useDocuments } from '@/app/hooks/useDocument';
import { Message, ModelOption, UploadedFile, UploadedFileWithUrl, DocumentReference } from '@/app/types/chat';
import { generatePresignedUrl } from '@/utils/presignedUrls';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { ChatBubble } from '@/components/ChatBubble';
import { WelcomeScreen } from '@/components/WelcomeScreen';

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
  const { sessions, updateSessionTitle } = useChatSessions(user?.id);
  const { createDocument, saveDocument, getDocumentByReference, getAllUserDocumentsWithVersions } = useDocuments({ userId: user?.id });

  const [input, setInput] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google'
  });
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | UploadedFileWithUrl>();
  const [documentReference, setDocumentReference] = useState<DocumentReference>();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const streamingContentRef = useRef<string>('');
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [streamingStarted, setStreamingStarted] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [streamingDocumentData, setStreamingDocumentData] = useState<{
    title: string;
    content: string;
    extra?: any;
  } | null>(null);
  const [streamingCompleted, setStreamingCompleted] = useState(false);
  const [messageFiles, setMessageFiles] = useState<UploadedFile[]>([]);
  const [messageDocumentReferences, setMessageDocumentReferences] = useState<{ [key: string]: { id: string; title: string } }>({});
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [allAvailableVersions, setAllAvailableVersions] = useState<any[]>([]);

  const aiSubmittedSession = useRef<string | null>(null);
  const currentDocumentReference = useRef<DocumentReference | null>(null);

  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadMoreMessages,
    addMessage,
    updateMessage,
  } = useChatMessages({ sessionId: activeSessionId });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { object, submit, isLoading, error } = useObject({
    api: '/api/chat',
    schema: CanvasDocumentSchema,
  });

  const updateStreamingContentThrottled = useCallback((content: string) => {
    streamingContentRef.current = content;
    
    // Clear existing timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }
    
    // Throttle state updates to avoid excessive re-renders
    streamingTimeoutRef.current = setTimeout(() => {
      setStreamingContent(streamingContentRef.current);
    }, 100); // Update UI every 100ms
  }, []);

  const clearSessionState = () => {
    setInput('');
    setUploadedFile(undefined);
    setDocumentReference(undefined);
    setIsEditorOpen(false);
    setActiveDocumentId(null);
    setStreamingMessageId(null);
    setStreamingStarted(false);
    setStreamingDocumentData(null);
    setStreamingCompleted(false);
    setStreamingContent('');
    streamingContentRef.current = '';
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
    aiSubmittedSession.current = null;
    setShouldAutoScroll(false);
    setMessageDocumentReferences({});
    setIsEditingMode(false);
    currentDocumentReference.current = null;
    setAllAvailableVersions([]);
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

  const handleDocumentReference = (docRef: DocumentReference) => setDocumentReference(docRef);
  
  const handleDocumentReferenceRemove = () => setDocumentReference(undefined);

  useEffect(() => {
    clearSessionState();
    // Load all available document versions for this user
    if (user?.id) {
      getAllUserDocumentsWithVersions().then(versions => {
        setAllAvailableVersions(versions);
      });
    }
  }, [activeSessionId, user?.id, getAllUserDocumentsWithVersions]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Only trigger auto-scroll when it is truly a user/bot new message
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShouldAutoScroll(false);
    }
  }, [messages, shouldAutoScroll]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
    if (container.scrollTop === 0 && hasMore && !messagesLoading) {
      const oldScrollHeight = container.scrollHeight;
      handleLoadMoreMessages(); // uses wrapped logic to disable auto-scroll
      setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - oldScrollHeight;
      }, 100);
    }
  }, [hasMore, messagesLoading, loadMoreMessages]);

  // This wrapper disables auto-scroll when loading older messages
  const handleLoadMoreMessages = async () => {
    setShouldAutoScroll(false); // Prevent auto-scroll on history pagination
    loadMoreMessages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId || messagesLoading) return;

    setShouldAutoScroll(true); // Enable scroll to bottom for new chat response

    // Generate presigned URL for file if needed for LLM context
    let fileForLLM: UploadedFileWithUrl | undefined;
    if (uploadedFile) {
      // Generate presigned URL for LLM context
      const presignedData = await generatePresignedUrl(uploadedFile.storagePath, 7200); // 2 hours for LLM processing
      if (presignedData) {
        fileForLLM = {
          ...uploadedFile,
          fileUrl: presignedData.signedUrl,
          urlExpiresAt: presignedData.expiresAt
        };
      }
    }

    // Fetch document content if document reference is provided
    let documentContext: any = null;
    if (documentReference && documentReference.documentId) {
      try {
        // Use the new method to get document based on reference type
        const referenceType = documentReference.version ? 'versioned' : 'latest';
        const documentData = await getDocumentByReference(
          documentReference.documentId, 
          referenceType,
          documentReference.version
        );
        
        if (documentData) {
          documentContext = documentData;
        }
      } catch (error) {
        console.error('Error fetching referenced document:', error);
        toast.error('Failed to fetch referenced document');
      }
    }

    const userMessage: Omit<Message, 'id' | 'created_at'> = {
      session_id: activeSessionId,
      role: 'user',
      content: input,
      file_data: uploadedFile // Store without URL in database
    };

    setInput('');
    setUploadedFile(undefined);
    setDocumentReference(undefined);

    const addedMessage = await addMessage(userMessage);
    if (!addedMessage) return;

    // Track document reference for this message and set editing mode
    if (documentReference) {
      currentDocumentReference.current = documentReference;
      setIsEditingMode(true);
      setMessageDocumentReferences(prev => ({
        ...prev,
        [addedMessage.id]: {
          id: documentReference.documentId,
          title: documentReference.title || 'Referenced Document'
        }
      }));
    } else {
      currentDocumentReference.current = null;
      setIsEditingMode(false);
    }

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
        file: fileForLLM, // Send with presigned URL to LLM
        documentReference: documentContext
      }];
    } else {
      // Generate presigned URLs for all historical messages with files
      const messagesWithUrls = await Promise.all(
        [...messages, addedMessage].map(async (msg) => {
          if (msg.file_data) {
            const presignedData = await generatePresignedUrl(msg.file_data.storagePath, 7200);
            return {
              role: msg.role,
              content: msg.content,
              file: presignedData ? {
                ...msg.file_data,
                fileUrl: presignedData.signedUrl,
                urlExpiresAt: presignedData.expiresAt
              } : undefined
            };
          }
          return {
            role: msg.role,
            content: msg.content,
            file: msg.file_data
          };
        })
      );
      
      // Add document reference to the last message if present
      if (documentContext && messagesWithUrls.length > 0) {
        (messagesWithUrls[messagesWithUrls.length - 1] as any).documentReference = documentContext;
      }
      
      contextToSend = messagesWithUrls;
    }
    aiSubmittedSession.current = activeSessionId;
    setStreamingStarted(false);
    submit({ messages: contextToSend, model: selectedModel });
    setIsEditorOpen(false);
  };

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 2000);
  }, [activeSessionId, scrollToBottom]);

  // DOC View Logic - now works with document IDs
  const openDocument = (messageId: string, documentId: string) => {
    if (documentId) {
      setIsEditorOpen(true);
      setActiveDocumentId(documentId);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setActiveDocumentId(null);
  };

  const updateDocument = async (documentContent: EditorDocumentContent) => {
    if (activeDocumentId) {
      await saveDocument(activeDocumentId, documentContent);
      toast.success('Document Saved');
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // STREAMING LOGIC - Fixed to prevent infinite loops
  useEffect(() => {
    const handleStreaming = async () => {
      // Only process if this is the active session and we have streaming data
      if (!activeSessionId || aiSubmittedSession.current !== activeSessionId) {
        return;
      }

      // Start of streaming: create only the message (no document yet)
      if (isLoading && !streamingMessageId && !streamingStarted) {
        setStreamingStarted(true);
        setStreamingCompleted(false);
        setShouldAutoScroll(true);
        
        try {
          const aiMessage: Omit<Message, 'id' | 'created_at'> = {
            session_id: activeSessionId,
            role: 'assistant',
            content: '',
          };
          
          const addedMessage = await addMessage(aiMessage);
          if (addedMessage) {
            setStreamingMessageId(addedMessage.id);
          }
        } catch (error) {
          console.error('Error creating streaming message:', error);
          setStreamingStarted(false);
        }
        return;
      }
      
      // During streaming: only accumulate content locally (no API calls)
      if (streamingMessageId && isLoading && (object?.general || object?.document || object?.title)) {
        const currentContent = object?.general || '';
        const currentDocumentContent = object?.document || '';
        const currentTitle = object?.title || '';
        
        // Update local streaming content for immediate UI feedback (throttled)
        if (currentContent) {
          updateStreamingContentThrottled(currentContent);
        }
        
        // Accumulate document data (don't save to DB yet)
        if (currentDocumentContent || currentTitle) {
          setStreamingDocumentData({
            title: currentTitle,
            content: currentDocumentContent,
            extra: cleanExtraObject(object?.extra),
          });
        }
        
        setShouldAutoScroll(true);
        return;
      }
      
      // End of stream: update message content once and create document if needed
      if (!isLoading && streamingMessageId && streamingStarted && !streamingCompleted) {
        setStreamingCompleted(true);
        
        try {
          // Prepare the final message updates
          const finalContent = streamingContentRef.current || object?.general || '';
          const messageUpdates: any = {};
          
          if (finalContent) {
            messageUpdates.content = finalContent;
          }

          // Create or edit document based on context
          const hasContent = streamingDocumentData?.content?.trim();
          const hasTitle = streamingDocumentData?.title?.trim();
          const shouldProcessDocument = hasContent || hasTitle;
          
          if (shouldProcessDocument && streamingDocumentData) {
            // Check if we're editing an existing document (from document reference)
            const isEditingExistingDocument = currentDocumentReference.current?.documentId;
            
            if (isEditingExistingDocument && currentDocumentReference.current) {
              // Edit the existing document using saveDocument (handles versioning)
              const updatedDocument = await saveDocument(currentDocumentReference.current.documentId, {
                title: streamingDocumentData.title || 'Untitled Document',
                content: streamingDocumentData.content || '',
                extra: streamingDocumentData.extra,
              });
              
              if (updatedDocument) {
                // Add document metadata to the message update
                messageUpdates.document = {
                  doc_id: updatedDocument.id,
                  doc_title: updatedDocument.title,
                  doc_version: updatedDocument.version_number,
                  reference_type: 'versioned',
                  created_at: new Date().toISOString()
                };
                
                // Open the editor with the updated document
                setActiveDocumentId(updatedDocument.id);
                setIsEditorOpen(true);
              }
            } else {
              // Create a new document
              const newDocument = await createDocument({
                title: streamingDocumentData.title || 'Untitled Document',
                content: streamingDocumentData.content || '',
                extra: streamingDocumentData.extra,
              });
              
              if (newDocument) {
                // Add document metadata to the message update
                messageUpdates.document = {
                  doc_id: newDocument.id,
                  doc_title: newDocument.title,
                  doc_version: newDocument.version_number,
                  reference_type: 'latest',
                  created_at: new Date().toISOString()
                };
                
                // Open the editor with the new document
                setActiveDocumentId(newDocument.id);
                setIsEditorOpen(true);
              }
            }
          }

          // Single API call to update message with both content and document metadata
          if (Object.keys(messageUpdates).length > 0) {
            await updateMessage(streamingMessageId, messageUpdates);
          }
        } catch (error) {
          console.error('Error finalizing document:', error);
        } finally {
          // Cleanup streaming state
          setStreamingMessageId(null);
          setStreamingStarted(false);
          setStreamingDocumentData(null);
          setStreamingCompleted(false);
          setStreamingContent('');
          streamingContentRef.current = '';
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
          }
          aiSubmittedSession.current = null;
          setIsEditingMode(false);
          currentDocumentReference.current = null;
        }
      }
    };

    handleStreaming();
  }, [
    isLoading, 
    object?.general, 
    object?.document, 
    object?.title, 
    object?.extra,
    activeSessionId, 
    streamingMessageId, 
    streamingStarted, 
    streamingCompleted,
    addMessage, 
    updateMessage, 
    createDocument
  ]);

  // Handle streaming errors
  useEffect(() => {
    if (error && streamingMessageId) {
      setStreamingMessageId(null);
      setStreamingStarted(false);
      setStreamingDocumentData(null);
      setStreamingCompleted(false);
      aiSubmittedSession.current = null;
    }
  }, [error, streamingMessageId]);

  // // Update message files when a new file is uploaded
  useEffect(() => {
    if (messages.length > 0) {
      const fileDatas = messages
        .map((message) => message.file_data)
        .filter((file): file is UploadedFile => file !== undefined && file !== null);
      setMessageFiles(fileDatas);
    }
  }, [messages]);

  // Get messages with documents for document reference dropdown (deduplicated by doc_id)
  // This ensures each document appears only once, showing the latest version
  const messagesWithDocuments = messages
    .filter(msg => msg.document && msg.role === 'assistant')
    .reduce((unique, message) => {
      // Only keep the latest message for each doc_id
      const existingIndex = unique.findIndex(m => m.document?.doc_id === message.document?.doc_id);
      if (existingIndex === -1) {
        unique.push(message);
      } else {
        // Replace with newer message (messages are ordered chronologically)
        unique[existingIndex] = message;
      }
      return unique;
    }, [] as Message[]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
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
                        onClick={handleLoadMoreMessages}
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
                        isStreaming={!!isLoading}
                        isActiveStream={streamingMessageId === message.id}
                        streamingContent={streamingMessageId === message.id ? streamingContent : ''}
                        referencedDocument={messageDocumentReferences[message.id] || null}
                        isEditingMode={isEditingMode && streamingMessageId === message.id}
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
              {/* Floating Dock */}
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
                    messageFiles={messageFiles}
                    documentReference={documentReference}
                    onDocumentReference={handleDocumentReference}
                    onDocumentReferenceRemove={handleDocumentReferenceRemove}
                    messagesWithDocuments={messagesWithDocuments}
                    allAvailableVersions={allAvailableVersions}
                  />
                </div>
              </div>
            </div>
          ) : (
            <WelcomeScreen/>
          )}
        </div>
        {/* CANVAS EDITOR AS SIDE COLUMN */}
        <div
          className={`transition-all duration-500 ease-in-out border-l border-gray-600 bg-gray-900 overflow-hidden ${
            isEditorOpen && activeDocumentId
              ? "w-[clamp(350px,45vw,700px)] min-w-[350px] opacity-100"
              : "w-0 min-w-0 opacity-0"
          }`}
          style={{ boxShadow: isEditorOpen ? "-2px 0 16px rgba(0,0,0,0.12)" : undefined }}
        >
          {isEditorOpen && activeDocumentId && (
            <CanvasTextEditor
              documentId={activeDocumentId}
              onSave={updateDocument}
              onClose={closeEditor}
              isStreaming={isLoading && streamingMessageId !== null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
