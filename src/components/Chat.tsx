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
import { Message, ModelOption, UploadedFile, UploadedFileWithUrl, DocumentReference, DocumentMetadata } from '@/app/types/chat';
import { generatePresignedUrl } from '@/utils/presignedUrls';
import { toast } from 'sonner';
import { getErrorMessage, isNetworkError } from '@/utils/errorHandling';
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

// Type for AI context messages
interface AIContextMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image?: string }>;
  documentReference?: {
    title?: string;
    content?: string;
    doc_id?: string;
  };
  file?: {
    storagePath: string;
    fileUrl?: string;
    urlExpiresAt?: string;
    metadata?: {
      type: string;
      originalName?: string;
    };
  };
  attachments?: Array<{ url: string; contentType?: string }>;
}

const cleanExtraObject = (extra: Record<string, unknown> | undefined): {
  wordCount?: number;
  estimatedReadTime?: string;
  tags?: string[];
  category?: string;
} | undefined => {
  if (!extra) return undefined;
  return {
    wordCount: typeof extra.wordCount === 'number' ? extra.wordCount : undefined,
    estimatedReadTime: typeof extra.estimatedReadTime === 'string' ? extra.estimatedReadTime : undefined,
    tags: Array.isArray(extra.tags) ? (extra.tags as unknown[]).filter((tag: unknown) => typeof tag === 'string' && tag !== undefined) as string[] : undefined,
    category: typeof extra.category === 'string' ? extra.category : undefined,
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
  const [activeDocumentVersion, setActiveDocumentVersion] = useState<number | null>(null);
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
    extra?: {
      wordCount?: number;
      estimatedReadTime?: string;
      tags?: string[];
      category?: string;
    };
  } | null>(null);
  const [streamingCompleted, setStreamingCompleted] = useState(false);
  const [messageFiles, setMessageFiles] = useState<UploadedFile[]>([]);
  const [isDocumentVersionsLoading, setIsDocumentVersionsLoading] = useState(false);
  const [allAvailableVersions, setAllAvailableVersions] = useState<Array<{
    doc_id: string;
    doc_title: string;
    versions: Array<{
      version_number: number;
      reference_type: string;
      doc_title: string;
      is_current: boolean;
      created_at: string;
      message_id: string;
    }>;
  }>>([]);
  
  // Minimal error/retry state
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  
  // Timeout for detecting silent failures
  const streamingTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Throttle state updates to avoid excessive re-renders but be more responsive
    streamingTimeoutRef.current = setTimeout(() => {
      setStreamingContent(streamingContentRef.current);
    }, 50); // Update UI every 50ms for better responsiveness
  }, []);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  const clearSessionState = () => {
    setStreamingMessageId(null);
    setStreamingContent('');
    streamingContentRef.current = '';
    setShouldAutoScroll(false);
    setStreamingDocumentData({ title: '', content: '', extra: undefined });
    setAllAvailableVersions([]);
    setRetryingMessageId(null);
    
    // Clear any active timeouts
    if (streamingTimeoutIdRef.current) {
      clearTimeout(streamingTimeoutIdRef.current);
      streamingTimeoutIdRef.current = null;
    }
  };

  // Enhanced error handler with better error messages
  const handleAIError = useCallback(async (messageId: string, error: Error) => {
    let errorMessage = getErrorMessage(error);
    
    // Provide more user-friendly error messages
    if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'Invalid API key. Please check your API configuration in the settings.';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorMessage = 'Access forbidden. Please check your API key permissions.';
    } else if (isNetworkError(error)) {
      errorMessage = 'Network connection failed. Please check your internet connection and try again.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. The AI service may be experiencing high load.';
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      errorMessage = 'Too many requests. Please wait a moment before trying again.';
    } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
      errorMessage = 'AI service is temporarily unavailable. Please try again in a few moments.';
    } else if (!errorMessage || errorMessage === 'AI request failed') {
      errorMessage = 'Something went wrong while generating the response. Please try again.';
    }

    try {
      const currentMessage = messages.find(m => m.id === messageId);
      const retryCount = (currentMessage?.ai_retry_count || 0) + 1;
      
      await updateMessage(messageId, {
        ai_state: 'error' as const,
        ai_error_message: errorMessage,
        ai_retry_count: retryCount
      });
    } catch (err) {
      console.error('Failed to mark message error:', err);
    }

    // Reset streaming states
    setRetryingMessageId(null);
    setStreamingStarted(false);
    setStreamingMessageId(null);
    
    // Clear any active timeouts
    if (streamingTimeoutIdRef.current) {
      clearTimeout(streamingTimeoutIdRef.current);
      streamingTimeoutIdRef.current = null;
    }
  }, [updateMessage, messages]);

  // AI request submission with network retry
  const submitAIRequest = useCallback(async (
    contextToSend: AIContextMessage[],
    model: ModelOption,
    userMessageId: string
  ) => {
    try {
      // Store the original request data to move to assistant message later
      aiSubmittedSession.current = activeSessionId;
      setStreamingStarted(false);
      
      // Submit the request (the AI SDK handles its own retries)
      submit({ messages: contextToSend, model: model });
    } catch (err) {
      console.error('Error submitting AI request:', err);
      await handleAIError(userMessageId, err as Error);
    }
  }, [activeSessionId, submit, handleAIError]);

  // Simplified retry function
  const retryAISubmission = useCallback(async (messageId?: string) => {
    if (!activeSessionId || !messageId) return;
    
    const assistantMessage = messages.find(m => m.id === messageId);
    if (!assistantMessage?.ai_original_request) {
      toast.error('Cannot retry: original request data not found');
      return;
    }

    const orig = assistantMessage.ai_original_request;
    const modelOption: ModelOption = {
      id: orig.model.id,
      name: orig.model.name,
      provider: orig.model.provider
    };

    // Use the stored full context for exact retry
    let contextToSend: AIContextMessage[] = [];
    
    if (orig.fullContext) {
      // Use the exact same context that was sent originally
      contextToSend = JSON.parse(JSON.stringify(orig.fullContext)) as AIContextMessage[];
      
      // Regenerate presigned URLs for any files in the context (they may have expired)
      for (const message of contextToSend) {
        if (message.file?.storagePath) {
          try {
            const presignedData = await generatePresignedUrl(message.file.storagePath, 7200);
            if (presignedData) {
              message.file.fileUrl = presignedData.signedUrl;
              message.file.urlExpiresAt = presignedData.expiresAt;
            }
          } catch (err) {
            console.error('Failed to regenerate file URL for retry:', err);
            // Remove file if we can't regenerate URL
            delete message.file;
          }
        }
      }
      
      // Refresh document references if they exist (in case document was updated)
      for (const message of contextToSend) {
        if (message.documentReference && typeof message.documentReference === 'object' && 'doc_id' in message.documentReference) {
          // This is already the processed document content, keep as is for retry
          // Document references are static content for the retry
        }
      }
    } else {
      // Fallback for old messages without fullContext - reconstruct as before
      contextToSend = [{ role: 'user', content: orig.input }];

      // Handle file if present
      if (orig.uploadedFile?.storagePath) {
        try {
          const presignedData = await generatePresignedUrl(orig.uploadedFile.storagePath, 7200);
          if (presignedData) {
            contextToSend[0].file = { 
              storagePath: orig.uploadedFile.storagePath, 
              fileUrl: presignedData.signedUrl, 
              urlExpiresAt: presignedData.expiresAt 
            };
          }
        } catch (err) {
          console.error('Failed to generate file URL for retry:', err);
        }
      }

      // Handle document reference if present
      if (orig.documentReference?.documentId) {
        try {
          const referenceType = orig.documentReference.version ? 'versioned' : 'latest';
          const doc = await getDocumentByReference(
            orig.documentReference.documentId, 
            referenceType,
            orig.documentReference.version
          );
          if (doc) contextToSend[0].documentReference = doc;
        } catch (err) {
          console.error('Failed to fetch document for retry:', err);
        }
      }
    }

    // Set the streaming message ID to the existing assistant message for retry
    setStreamingMessageId(messageId);
    aiSubmittedSession.current = activeSessionId;
    setStreamingStarted(false);
    setStreamingCompleted(false);
    setStreamingContent('');
    streamingContentRef.current = '';
    
    // Submit the retry request
    submit({ messages: contextToSend, model: modelOption });
  }, [activeSessionId, messages, generatePresignedUrl, getDocumentByReference]);

  // Simple retry handler
  const handleRetry = useCallback(async (assistantMessageId: string) => {
    if (retryingMessageId === assistantMessageId) return; // Prevent concurrent retries
    
    setRetryingMessageId(assistantMessageId);
    try {
      // Clear error state before retry and mark as pending
      await updateMessage(assistantMessageId, { 
        ai_state: 'pending' as const, 
        ai_error_message: null,
        content: '' // Clear any previous error content
      });
      
      await retryAISubmission(assistantMessageId);
    } catch (err) {
      console.error('Retry failed:', err);
      await handleAIError(assistantMessageId, err as Error);
    } finally {
      setRetryingMessageId(null);
    }
  }, [retryingMessageId, retryAISubmission, handleAIError, updateMessage]);

  // Simple dismiss handler - just clear error state
  const handleDismiss = useCallback(async (messageId: string) => {
    await updateMessage(messageId, {
      ai_state: 'success',
      ai_error_message: null,
      content: '', // Clear content to hide the message
    });
  }, [updateMessage]);

  // Function to update message document metadata when a document is updated
  // This mirrors the database trigger behavior: change reference_type from 'latest' to 'versioned'
  const updateMessagesDocumentMetadata = useCallback((documentId: string) => {
    messages?.forEach(message => {
      if (message.document && 
          message.document.doc_id === documentId && 
          message.document.reference_type === 'latest') {
        
        // Update the message to mark old version as 'versioned'
        const updatedMessage = {
          ...message,
          document: {
            ...message.document,
            reference_type: 'versioned' as const
          }
        };
        
        updateMessage(message.id, updatedMessage);
      }
    });
  }, [messages, updateMessage]);

  // Function to fetch document versions on demand (when user clicks edit document)
  const fetchDocumentVersionsOnDemand = useCallback(async () => {
    if (user?.id && activeSessionId) {
      setIsDocumentVersionsLoading(true);
      try {
        const versions = await getAllUserDocumentsWithVersions(activeSessionId);
        setAllAvailableVersions(versions);
        return versions;
      } catch (error) {
        console.error('Failed to fetch document versions:', error);
        return [];
      } finally {
        setIsDocumentVersionsLoading(false);
      }
    }
    return [];
  }, [user?.id, activeSessionId, getAllUserDocumentsWithVersions]);  
  
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
    // Clear document versions when session changes
    setAllAvailableVersions([]);
  }, [activeSessionId]);

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
    let documentContext: { title?: string; content?: string; doc_id?: string } | null = null;
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

    // Prepare document reference data if present
    let documentMetadata: DocumentMetadata | undefined = undefined;
    if (documentReference) {
      documentMetadata = {
        doc_id: documentReference.documentId,
        doc_title: documentReference.title || 'Referenced Document',
        doc_version: documentReference.version || undefined,
        reference_type: documentReference.version ? 'versioned' : 'latest',
        created_at: new Date().toISOString()
      };
    }

    const userMessage: Omit<Message, 'id' | 'created_at'> = {
      session_id: activeSessionId,
      role: 'user',
      content: input,
      file_data: uploadedFile, // Store without URL in database
      document: documentMetadata // Store document reference in database
    };

    setInput('');
    setUploadedFile(undefined);
    setDocumentReference(undefined);

    const addedMessage = await addMessage(userMessage);
    if (!addedMessage) return;

    // Track document reference for this message
    if (documentReference) {
      currentDocumentReference.current = documentReference;
    } else {
      currentDocumentReference.current = null;
    }

    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession?.title === 'Untitled Session' && messages.length === 0) {
      const generatedTitle = await generateSessionTitle(input);
      if (generatedTitle) {
        await updateSessionTitle(activeSessionId, generatedTitle);
      }
    }

    let contextToSend: AIContextMessage[];
    if (messages.length === 0) {
      contextToSend = [{
        role: addedMessage.role,
        content: addedMessage.content,
        file: fileForLLM, // Send with presigned URL to LLM
        documentReference: documentContext || undefined
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
        (messagesWithUrls[messagesWithUrls.length - 1] as { role: string; content: string; documentReference?: unknown }).documentReference = documentContext;
      }
      
      contextToSend = messagesWithUrls;
    }
    
    // Create assistant message immediately for instant visual feedback
    const aiMessage: Omit<Message, 'id' | 'created_at'> = {
      session_id: activeSessionId,
      role: 'assistant',
      content: '', // Will be populated with streaming content
      ai_state: 'pending',
    };
    
    const assistantMessage = await addMessage(aiMessage);
    if (assistantMessage) {
      setStreamingMessageId(assistantMessage.id);
      setShouldAutoScroll(true);
      
      // Store original request data on assistant message for retry functionality
      const originalRequestData = {
        input,
        model: {
          id: selectedModel.id,
          name: selectedModel.name,
          provider: selectedModel.provider
        },
        uploadedFile: uploadedFile ? { storagePath: uploadedFile.storagePath } : undefined,
        documentReference: documentReference ? { 
          documentId: documentReference.documentId, 
          version: documentReference.version 
        } : undefined,
        fullContext: JSON.parse(JSON.stringify(contextToSend)) // Store complete context
      };
      
      await updateMessage(assistantMessage.id, {
        ai_original_request: originalRequestData
      });
    }
    
    // Use the new error-handling submit function
    await submitAIRequest(contextToSend, selectedModel, addedMessage.id);
    setIsEditorOpen(false);
  };

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 2000);
  }, [activeSessionId, scrollToBottom]);

  // Scroll to bottom when messages are loaded for the first time (initial rendering)
  useEffect(() => {
    if (messages.length > 0 && !messagesLoading) {
      // Add a small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages.length > 0 && !messagesLoading, scrollToBottom]);

  // DOC View Logic 
  const openDocument = (documentId: string, documentVersion: number | null) => {
    if (documentId) {
      setIsEditorOpen(true);
      setActiveDocumentId(documentId);
      setActiveDocumentVersion(documentVersion);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setActiveDocumentId(null);
  };

  const updateDocument = async (documentContent: EditorDocumentContent) => {
    if (activeDocumentId) {
      const updatedDocument = await saveDocument(activeDocumentId, documentContent);
      toast.success('Document Saved');
      
      // Update message metadata to reflect the document update
      if (updatedDocument) {
        updateMessagesDocumentMetadata(activeDocumentId);
        
        // Reset activeDocumentVersion to null so CanvasTextEditor shows "Latest"
        // This ensures the version dropdown reflects the newly created version
        setActiveDocumentVersion(null);
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // STREAMING LOGIC 
  useEffect(() => {
    const handleStreaming = async () => {
      // Only process if this is the active session and we have streaming data
      if (!activeSessionId || aiSubmittedSession.current !== activeSessionId) {
        return;
      }

      // Handle streaming errors - check for both retrying and streaming messages
      if (error && (retryingMessageId || streamingMessageId)) {
        const targetMessageId = retryingMessageId || streamingMessageId;
        if (targetMessageId) {
          await handleAIError(targetMessageId, error);
        }
        return;
      }

      // Start of streaming: use existing message (already created) or handle retry
      if (isLoading && !streamingStarted) {
        setStreamingStarted(true);
        setStreamingCompleted(false);
        setShouldAutoScroll(true);
        
        try {
          // For new messages, streamingMessageId should already be set from handleSubmit
          // For retries, streamingMessageId is set in retryAISubmission
          if (streamingMessageId) {
            // For retries, just ensure the message is in pending state (original request data is already stored)
            const currentMessage = messages.find(m => m.id === streamingMessageId);
            if (currentMessage && retryingMessageId) {
              await updateMessage(streamingMessageId, {
                ai_state: 'pending',
                content: '' // Clear previous content for retry
              });
            }
            
            // Set initial streaming content to show immediate loading
            setStreamingContent('');
            streamingContentRef.current = '';
            
            // Set timeout to detect silent failures (e.g., API key errors)
            streamingTimeoutIdRef.current = setTimeout(() => {
              if (!streamingContentRef.current || streamingContentRef.current.trim() === '') {
                handleAIError(streamingMessageId, new Error('Request timed out - no response received'));
              }
            }, 30000); // 30 second timeout
          }
        } catch (error) {
          console.error('Error setting up streaming message:', error);
          setStreamingStarted(false);
        }
        return;
      }
      
      // During streaming: immediately update content and show progress
      if (streamingMessageId && isLoading && (object?.general || object?.document || object?.title)) {
        const currentContent = object?.general || '';
        const currentDocumentContent = object?.document || '';
        const currentTitle = object?.title || '';
        
        // Always update streaming content immediately for responsive UI
        updateStreamingContentThrottled(currentContent);
        
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
          const messageUpdates: Partial<Message> = {};
          
          // Check if we have any actual content or document data
          const hasActualContent = finalContent && finalContent.trim();
          const hasDocumentData = streamingDocumentData?.content?.trim() || streamingDocumentData?.title?.trim();
          
          // If no content and no document data, this might be an error condition
          if (!hasActualContent && !hasDocumentData) {
            // Mark as error - likely an API key issue or other failure
            messageUpdates.ai_state = 'error';
            messageUpdates.ai_error_message = 'Failed to generate response. Please check your API configuration.';
            messageUpdates.content = '';
          } else {
            if (finalContent) {
              messageUpdates.content = finalContent;
            }

            // Create or edit document based on context
          const hasContent = streamingDocumentData?.content?.trim();
          const hasTitle = streamingDocumentData?.title?.trim();
          const shouldProcessDocument = hasContent || hasTitle;
          
          if (shouldProcessDocument && streamingDocumentData) {
            // Simple logic: Check if this message has a document reference in original request
            const currentMessage = messages.find(m => m.id === streamingMessageId);
            const referencedDocumentId = currentMessage?.ai_original_request?.documentReference?.documentId;
            
            if (referencedDocumentId) {
              // This is an edit operation - update the referenced document
              const updatedDocument = await saveDocument(referencedDocumentId, {
                title: streamingDocumentData.title || 'Untitled Document',
                content: streamingDocumentData.content || '',
                extra: streamingDocumentData.extra,
              });
              
              if (updatedDocument) {
                // Update message metadata to reflect the document update
                updateMessagesDocumentMetadata(referencedDocumentId);
                
                // Add document metadata to the message update
                messageUpdates.document = {
                  doc_id: updatedDocument.id,
                  doc_title: updatedDocument.title,
                  doc_version: updatedDocument.version_number,
                  reference_type: 'latest',
                  created_at: new Date().toISOString()
                };
                
                // Open the editor with the updated document
                setActiveDocumentId(updatedDocument.id);
                setIsEditorOpen(true);
              }
            } else {
              // No document reference - create a new document
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

            // Set success state when streaming completes (only if not already set to error)
            if (!messageUpdates.ai_state) {
              messageUpdates.ai_state = 'success';
              messageUpdates.ai_error_message = null;
            }
          }

          // Single API call to update message with both content and document metadata
          await updateMessage(streamingMessageId, messageUpdates);
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
          if (streamingTimeoutIdRef.current) {
            clearTimeout(streamingTimeoutIdRef.current);
            streamingTimeoutIdRef.current = null;
          }
          aiSubmittedSession.current = null;
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
    createDocument,
    error,
    retryingMessageId,
    handleAIError
  ]);

  // Handle streaming errors and cleanup
  useEffect(() => {
    if (error && (streamingMessageId || retryingMessageId)) {
      const targetMessageId = streamingMessageId || retryingMessageId;
      if (targetMessageId) {
        handleAIError(targetMessageId, error);
      }
      
      // Cleanup streaming state
      setStreamingMessageId(null);
      setStreamingStarted(false);
      setStreamingDocumentData(null);
      setStreamingCompleted(false);
      setRetryingMessageId(null);
      aiSubmittedSession.current = null;
    }
  }, [error, streamingMessageId, retryingMessageId, handleAIError]);

  // // Update message files when a new file is uploaded
  useEffect(() => {
    if (messages.length > 0) {
      const fileDatas = messages
        .map((message) => message.file_data)
        .filter((file): file is UploadedFile => file !== undefined && file !== null);
      setMessageFiles(fileDatas);
    }
  }, [messages]);


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
                  {messages
                    .map((message) => (
                    <div key={message.id} className="mx-auto max-w-[820px] w-full">
                      <ChatBubble
                        key={message.id}
                        message={message}
                        user={user}
                        onDocumentClick={openDocument}
                        isStreaming={!!isLoading}
                        isActiveStream={streamingMessageId === message.id}
                        streamingContent={streamingMessageId === message.id ? streamingContent : ''}
                        isEditingMode={(() => {
                          // Check if this assistant message has a document reference in its original request
                          if (message.ai_original_request?.documentReference?.documentId) {
                            return true;
                          }
                          
                          // Fallback: Check if the preceding user message has a document reference
                          if (message.role === 'assistant') {
                            const messageIndex = messages.findIndex(m => m.id === message.id);
                            if (messageIndex > 0) {
                              const prevMessage = messages[messageIndex - 1];
                              if (prevMessage.role === 'user' && prevMessage.document?.doc_id) {
                                return true;
                              }
                            }
                          }
                          
                          return false;
                        })()}
                        onRetry={handleRetry}
                        onDismiss={handleDismiss}
                      />
                    </div>
                  ))}

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
                    allAvailableVersions={allAvailableVersions}
                    onFetchDocumentVersions={fetchDocumentVersionsOnDemand}
                    isDocumentVersionsLoading={isDocumentVersionsLoading}
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
              documentVersion={activeDocumentVersion ?? undefined}
              documentVersionHandler={(version) => setActiveDocumentVersion(version ?? null)}
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
