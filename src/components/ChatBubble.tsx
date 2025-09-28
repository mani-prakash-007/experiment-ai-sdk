'use client';

import {
  User, Bot, FileText, ExternalLink, Image as ImageIcon, Paperclip, Loader2
} from 'lucide-react';
import { Message } from '@/app/types/chat';
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
  onDocumentClick: (messageId: string, documentId: string) => void;
  isError?: boolean;
  isStreaming?: boolean;
  isActiveStream?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  user,
  onDocumentClick,
  isError = false,
  isStreaming = false,
  isActiveStream = false,
}) => {
  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const [loadingFiles, setLoadingFiles] = useState<{ [key: string]: boolean }>({});

  const handleFileClick = async (storagePath: string, fileName: string) => {
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
  const renderFileContent = (fileData: any) => {
    if (!fileData) return null;

    function prettySize( bytes : number) {
      if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${bytes} B`;
    }

    const isLoading = loadingFiles[fileData.storagePath];
    const cachedUrl = fileUrls[fileData.storagePath];

    return (
      <div className="mt-3 pt-2">
        {fileData.metadata?.type?.startsWith('image/') && (
          <div className="space-y-2">
            {cachedUrl ? (
              <img
                src={cachedUrl}
                alt={fileData.fileName}
                className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '300px' }}
                onClick={() => window.open(cachedUrl, '_blank')}
              />
            ) : (
              <div 
                className="max-w-full h-30 w-40 bg-gray-700 rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:bg-gray-600 transition-colors flex items-center justify-center"
                onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
              >
                {isLoading ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <span className="text-sm text-gray-400">Loading image...</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-400">Click to view image</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center space-x-2 text-xs opacity-75">
              <ImageIcon className="w-3 h-3" />
              <span>{fileData.fileName}</span>
              <span>({(fileData.metadata.size / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
        )}
        {fileData.metadata?.type === 'application/pdf' && (
          <div className="space-y-2 max-w-[300px]">
            <div
              className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors w-full"
              onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
            >
              <div className="flex-shrink-0">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                ) : (
                  <FileText className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-900 truncate">
                  {fileData.fileName}
                </p>
                <p className="text-xs text-red-600">
                  PDF • {(fileData.metadata.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-red-600" />
            </div>
          </div>
        )}
        {(fileData.metadata?.type?.startsWith('text/') ||
          fileData.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i)) && (
          <div className="space-y-2 max-w-[300px]">
            <div
              className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
            >
              <div className="flex-shrink-0">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                ) : (
                  <FileText className="w-8 h-8 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate">
                  {fileData.fileName}
                </p>
                <p className="text-xs text-green-600">
                  Text File • {(fileData.metadata.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-green-600" />
            </div>
          </div>
        )}
        {fileData.metadata?.type &&
          !fileData.metadata.type.startsWith('image/') &&
          fileData.metadata.type !== 'application/pdf' &&
          !fileData.metadata.type.startsWith('text/') &&
          !fileData.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i) && (
            <div className="space-y-2 max-w-[300px]">
              <div
                className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleFileClick(fileData.storagePath, fileData.fileName)}
              >
                <div className="flex-shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
                  ) : (
                    <Paperclip className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileData.fileName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {fileData.metadata.type} • {prettySize(fileData.metadata.size)}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-600" />
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

  const renderGeneratingLoading = () => (
    <div className="text-sm">
      <div className="flex items-center">
      <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '0ms' }}></div>
      <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '150ms' }}></div>
      <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce mr-2" style={{ animationDelay: '300ms' }}></div>
      <span className="animate-pulse bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
        Generating
      </span>
      </div>
    </div>
  );

  const markdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
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

  // ENHANCED MAIN CONTENT RENDER LOGIC:
  const renderMessageContent = () => {
    const isAssistant = message.role === 'assistant';
    const hasContent = typeof message.content === 'string' && message.content.trim().length > 0;
    const hasDocument = !!(message.document_id);

    // 1. If actively streaming this bubble, show loading or stream content
    if (isStreaming && isActiveStream) {
      if (hasContent) {
        return (
          <div>
            {isAssistant ? (
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            ) : (
              message.content
            )}
            {!hasDocument && (
              <div className="mt-2 text-xs text-blue-300 opacity-75 animate-pulse">
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce mr-2" style={{ animationDelay: '300ms' }}></div>
                  Preparing document...
                </div>
              </div>
            )}
          </div>
        );
      } else {
        return renderGeneratingLoading();
      }
    }

    // 2. Assistant message logic (after streaming done)
    if (isAssistant) {
      if (hasContent) {
        return (
          <ReactMarkdown components={markdownComponents}>
            {message.content}
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
      return (
        <div className="text-sm opacity-75 italic text-red-300">
          Response generated but no content available.
        </div>
      );
    }

    // 3. User messages
    if (hasContent) return message.content;

    // 4. Fallback for empty user message
    return (
      <div className="text-sm opacity-75 italic">
        Message sent.
      </div>
    );
  };

  if (message.id === 'loading') {
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700">
          {renderBounceLoading()}
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-red-900/50 text-red-100 rounded-2xl rounded-bl-md px-4 py-3 border border-red-700">
          <div className="text-sm font-medium">Error</div>
          <div className="text-sm opacity-90">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        message.role === 'user' 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
          : 'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}>
        {message.role === 'user' ? (
          user?.user_metadata?.avatar_url ?  
          <img src={user?.user_metadata?.avatar_url} alt="avatar" className="w-full h-full rounded-full" /> :
          <User className="w-4 h-4 text-white" /> 
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div className={`flex-1 max-w-[80%] w-full ${message.role === 'user' ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            message.role === 'user'
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
          } ${message.document_id ? 'cursor-pointer hover:shadow-xl transition-shadow hover:border-white/50' : ''}`}
          onClick={() => message.document_id && onDocumentClick(message.id, message.document_id)}
        >
          <div className={`max-w-none text-sm leading-relaxed ${
            message.role === 'assistant' ? 'prose-markdown' : ''
          }`}>
            {renderMessageContent()}
          </div>
          {renderFileContent(message.file_data)}
          {message.document_id && (
            <div className="mt-2 pt-2 border-t border-gray-600 flex items-center space-x-2 text-xs text-gray-300">
              <FileText className="w-3 h-3" />
              <span>Click to view document</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
