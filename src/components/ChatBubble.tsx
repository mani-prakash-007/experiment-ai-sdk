'use client';

import React from 'react';
import {
  User, Bot, FileText, ExternalLink, Image as ImageIcon, Paperclip, Loader2, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { Message, UploadedFile } from '@/app/types/chat';
import { User as SupabaseUser } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { generatePresignedUrl } from '@/utils/presignedUrls';
import { useState } from 'react';
import { toast } from 'sonner';

interface ChatBubbleProps {
  message: Message;
  user: SupabaseUser | null;
  onDocumentClick: ( documentId: string , documentVersion : number | null) => void;
  isError?: boolean;
  isStreaming?: boolean;
  isActiveStream?: boolean;
  streamingContent?: string;
  isEditingMode?: boolean;
  onRetry?: (messageId: string) => void;
  onDismiss?: (messageId: string) => void;
}

const ChatBubbleComponent: React.FC<ChatBubbleProps> = ({
  message,
  user,
  onDocumentClick,
  onRetry,
  onDismiss,
  isStreaming = false,
  isActiveStream = false,
  streamingContent = '',
  isEditingMode = false,
}) => {
  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const [loadingFiles, setLoadingFiles] = useState<{ [key: string]: boolean }>({});

  const handleFileClick = async (storagePath: string) => {
    // If we already have a URL, use it
    if (fileUrls[storagePath]) {
      window.open(fileUrls[storagePath], '_blank');
      return;
    }

    // Show loading state
    setLoadingFiles(prev => ({ ...prev, [storagePath]: true }));

    try {
      const presignedData = await generatePresignedUrl(storagePath); // Use default 1 hour expiry
      if (presignedData) {
        setFileUrls(prev => ({ ...prev, [storagePath]: presignedData.signedUrl }));
        window.open(presignedData.signedUrl, '_blank');
      } else {
        toast.error('Unable to access file');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Error opening file');
    } finally {
      setLoadingFiles(prev => ({ ...prev, [storagePath]: false }));
    }
  };
  const renderFileContent = (fileData: UploadedFile) => {
    if (!fileData) return null;

    function prettySize( bytes : number) {
      if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${bytes} B`;
    }

    const isLoading = loadingFiles[fileData.storagePath];
    const cachedUrl = fileUrls[fileData.storagePath];

    return (
      <div className="mt-3 pt-2" data-testid="file-attachment">
        {fileData.metadata?.type?.startsWith('image/') && (
          <div className="space-y-2" data-testid="image-file-content">
            {cachedUrl ? (
              <img
                src={cachedUrl}
                alt={fileData.fileName}
                className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '300px' }}
                onClick={() => window.open(cachedUrl, '_blank')}
                data-testid="cached-image"
              />
            ) : (
              <div 
                className="max-w-full h-30 w-40 bg-gray-700 rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:bg-gray-600 transition-colors flex items-center justify-center"
                onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
                data-testid="image-placeholder"
              >
                {isLoading ? (
                  <div className="text-center" data-testid="image-loading">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <span className="text-sm text-gray-400">Loading image...</span>
                  </div>
                ) : (
                  <div className="text-center" data-testid="image-preview">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-400">Click to view image</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center space-x-2 text-xs opacity-75" data-testid="image-file-info">
              <ImageIcon className="w-3 h-3" />
              <span data-testid="image-file-name">{fileData.fileName}</span>
              <span data-testid="image-file-size">({(fileData.metadata.size / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
        )}
        {fileData.metadata?.type === 'application/pdf' && (
          <div className="space-y-2 max-w-[300px]" data-testid="pdf-file-content">
            <div
              className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors w-full"
              onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
              data-testid="pdf-file-preview"
            >
              <div className="flex-shrink-0">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 text-red-600 animate-spin" data-testid="pdf-loading-icon" />
                ) : (
                  <FileText className="w-8 h-8 text-red-600" data-testid="pdf-file-icon" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-900 truncate" data-testid="pdf-file-name">
                  {fileData.fileName}
                </p>
                <p className="text-xs text-red-600" data-testid="pdf-file-info">
                  PDF • {(fileData.metadata.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-red-600" data-testid="pdf-external-link-icon" />
            </div>
          </div>
        )}
        {(fileData.metadata?.type?.startsWith('text/') ||
          fileData.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i)) && (
          <div className="space-y-2 max-w-[300px]" data-testid="text-file-content">
            <div
              className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
              data-testid="text-file-preview"
            >
              <div className="flex-shrink-0">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin" data-testid="text-loading-icon" />
                ) : (
                  <FileText className="w-8 h-8 text-green-600" data-testid="text-file-icon" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate" data-testid="text-file-name">
                  {fileData.fileName}
                </p>
                <p className="text-xs text-green-600" data-testid="text-file-info">
                  Text File • {(fileData.metadata.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-green-600" data-testid="text-external-link-icon" />
            </div>
          </div>
        )}
        {fileData.metadata?.type &&
          !fileData.metadata.type.startsWith('image/') &&
          fileData.metadata.type !== 'application/pdf' &&
          !fileData.metadata.type.startsWith('text/') &&
          !fileData.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i) && (
            <div className="space-y-2 max-w-[300px]" data-testid="generic-file-content">
              <div
                className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
                data-testid="generic-file-preview"
              >
                <div className="flex-shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 text-gray-600 animate-spin" data-testid="generic-loading-icon" />
                  ) : (
                    <Paperclip className="w-8 h-8 text-gray-600" data-testid="generic-file-icon" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" data-testid="generic-file-name">
                    {fileData.fileName}
                  </p>
                  <p className="text-xs text-gray-600" data-testid="generic-file-info">
                    {fileData.metadata.type} • {prettySize(fileData.metadata.size)}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-600" data-testid="generic-external-link-icon" />
              </div>
            </div>
          )}
      </div>
    );
  };

  const renderBounceLoading = () => (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );

  const renderGeneratingLoading = (loadingText: string = 'Generating') => (
    <div className="text-sm">
      <div className="flex items-center">
        <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce mr-2" style={{ animationDelay: '300ms' }}></div>
        <span className="animate-pulse bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
          {loadingText}
        </span>
      </div>
    </div>
  );

  // Markdown components with proper types - eslint disable for react-markdown component props
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const markdownComponents = {
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          className="rounded-lg !bg-gray-900 !p-4 !my-4"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-700 text-purple-300 px-1.5 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    p: ({ children }: any) => (
      <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold mb-3 text-white">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-bold mb-3 text-white">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-bold mb-2 text-white">{children}</h3>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="text-gray-100">{children}</li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-purple-400 pl-4 my-3 italic text-gray-300">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline"
      >
        {children}
      </a>
    ),
    strong: ({ children }: any) => (
      <strong className="font-bold text-white">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-gray-300">{children}</em>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse border border-gray-600">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-gray-600 px-3 py-2 bg-gray-700 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-gray-600 px-3 py-2">{children}</td>
    ),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const renderMessageContent = () => {
    const isAssistant = message.role === 'assistant';
    // Use streaming content if actively streaming, otherwise use message content
    const displayContent = (isActiveStream && streamingContent !== undefined) ? streamingContent : message.content;
    const hasContent = typeof displayContent === 'string' && displayContent.trim().length > 0;
    const hasDocument = !!(message.document);

    // 1. If actively streaming this bubble, show immediate feedback
    if (isStreaming && isActiveStream) {
      if (hasContent) {
        // Show streaming content as it comes in
        return (
          <div>
            {isAssistant ? (
              <ReactMarkdown components={markdownComponents}>
                {displayContent}
              </ReactMarkdown>
            ) : (
              displayContent
            )}
            {/* Show document creation/editing status while streaming content */}
            <div className="mt-2 text-xs text-blue-300 opacity-75 animate-pulse">
              <div className="flex items-center">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce mr-2" style={{ animationDelay: '300ms' }}></div>
                {isEditingMode ? 'Editing document...' : 'Preparing document...'}
              </div>
            </div>
          </div>
        );
      } else {
        // No content yet, but actively streaming - show appropriate loading state
        const loadingText = isEditingMode ? 'Editing document' : 'Generating response';
        return renderGeneratingLoading(loadingText);
      }
    }

    // 2. If message is pending (ai_state: 'pending'), show loading even if not actively streaming
    if (isAssistant && message.ai_state === 'pending') {
      const loadingText = isEditingMode ? 'Editing document' : 'Generating response';
      return renderGeneratingLoading(loadingText);
    }

    // 3. Assistant message logic (after streaming done)
    if (isAssistant) {
      if (hasContent) {
        return (
          <ReactMarkdown components={markdownComponents}>
            {displayContent}
          </ReactMarkdown>
        );
      }
      if (hasDocument) {
        return (
          <div className="text-sm opacity-90">
            <span className="italic">Document created successfully.</span>
            <div className="text-xs mt-1 opacity-75">
              Click below to view the document.
            </div>
          </div>
        );
      }
      // If AI response has no content and no document, show a simple error message only if there's actually an error
      if (message.ai_state === 'error' && onRetry) {
        return (
          <div className="text-sm opacity-75 italic text-red-300 flex items-center space-x-2" data-testid="inline-error-message">
            <AlertCircle className="w-4 h-4" />
            <span>No response generated.</span>
            <button
              onClick={() => onRetry(message.id)}
              className="ml-2 text-blue-400 hover:text-blue-300 underline"
              data-testid="inline-retry-button"
            >
              Retry
            </button>
          </div>
        );
      }
      
      // Fallback for other cases - show loading state if not error
      if (message.ai_state !== 'error') {
        return renderGeneratingLoading('Generating response');
      }
      
      // Final fallback for error state without retry function
      return (
        <div className="text-sm opacity-75 italic text-red-300">
          Response generated but no content available.
        </div>
      );
    }

    // 4. User messages
    if (hasContent) return displayContent;

    // 5. Fallback for empty user message
    return (
      <div className="text-sm opacity-75 italic">
        Message sent.
      </div>
    );
  };

  if (message.id === 'loading') {
    return (
      <div className="flex items-start space-x-3" data-testid="chat-bubble-loading">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center" data-testid="loading-avatar">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700" data-testid="loading-bubble">
          {renderBounceLoading()}
        </div>
      </div>
    );
  }
  // Handle error state - simplified approach
  if (message.ai_state === 'error') {
    const errorMessage = message.ai_error_message || 'Something went wrong while generating the response.';
    const retryCount = message.ai_retry_count || 0;

    return (
      <div className="flex items-start space-x-3" data-testid="chat-bubble-error">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center" data-testid="error-avatar">
          <AlertCircle className="w-4 h-4 text-white" />
        </div>
        <div className="bg-red-900/20 text-red-100 rounded-2xl rounded-bl-md px-4 py-3 border border-red-500/30 backdrop-blur-sm" data-testid="error-bubble">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <div className="text-sm font-medium text-red-400" data-testid="error-title">
              Failed to generate response
            </div>
          </div>
          <div className="text-sm opacity-90 mb-3" data-testid="error-message">
            {errorMessage}
          </div>
          {retryCount > 0 && (
            <div className="text-xs text-red-300 opacity-75 mb-3" data-testid="retry-count">
              Retry attempt {retryCount}
            </div>
          )}
          <div className="flex items-center space-x-2">
            {onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors font-medium"
                data-testid="retry-button"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(message.id)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-gray-300 text-xs rounded-md transition-colors font-medium"
                data-testid="dismiss-button"
              >
                <X className="w-3 h-3" />
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`} data-testid={`chat-bubble-${message.role}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        message.role === 'user' 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
          : 'bg-gradient-to-r from-purple-500 to-pink-500'
      }`} data-testid={`${message.role}-avatar`}>
        {message.role === 'user' ? (
          user?.user_metadata?.avatar_url ?  
          <img src={user?.user_metadata?.avatar_url} alt="avatar" className="w-full h-full rounded-full" data-testid="user-avatar-image" /> :
          <User className="w-4 h-4 text-white" /> 
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div className={`flex-1 max-w-[80%] w-full ${message.role === 'user' ? 'flex justify-end' : ''}`}>
        <div
          className={`
            rounded-2xl px-4 py-3 shadow-sm
            ${message.role === 'user' 
              ? 'bg-blue-500 text-white rounded-br-md' 
              : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
            }
            ${message.document 
              ? 'cursor-pointer hover:shadow-xl transition-shadow hover:border-white/50' 
              : ''
            }
          `}
          onClick={() => {
            if (message.document) {
              const version = message.document.reference_type === 'latest' 
                ? null 
                : message.document.doc_version || null;
              onDocumentClick(message.document.doc_id, version);
            }
          }}
          data-testid={`message-content-${message.role}`}
        >
          <div className={`max-w-none text-sm leading-relaxed ${
            message.role === 'assistant' ? 'prose-markdown' : ''
          }`} data-testid="message-text">
            {renderMessageContent()}
          </div>
          {message.file_data && renderFileContent(message.file_data)}
          {message.document && message.role === 'user' && (
            <div className="mt-2 pt-2 border-t border-blue-400/30 flex items-center space-x-2 text-xs text-blue-300" data-testid="user-document-reference">
              <FileText className="w-3 h-3" />
              <span data-testid="referenced-document-title">Referenced Document: {message.document.doc_title}</span>
              {message.document.doc_version && (
                <span className="text-xs text-blue-400" data-testid="referenced-document-version">v{message.document.doc_version}</span>
              )}
              <div className="ml-auto text-xs text-purple-400" data-testid="edit-mode-indicator">
                📝 Edit Mode
              </div>
            </div>
          )}
          {message.document && message.role !== 'user' && (
            <div className="mt-2 pt-2 border-t border-gray-600 flex items-center space-x-2 text-xs text-gray-300" data-testid="assistant-document-reference">
              <FileText className="w-3 h-3" />
              <div className="flex-1">
                <span className="font-medium" data-testid="document-title">{message.document.doc_title}</span>
                {message.document.doc_version && (
                  <span className="ml-2 text-xs text-blue-400" data-testid="document-version">v{message.document.doc_version}</span>
                )}
              </div>
              <div className="text-xs text-purple-400" data-testid="document-action-hint">
                📄 Click to {message.document.reference_type === 'latest' ? 'edit' : 'view'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ChatBubbleComponent.displayName = 'ChatBubble';

export const ChatBubble = React.memo(ChatBubbleComponent);
