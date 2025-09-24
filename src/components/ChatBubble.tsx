'use client';

import { User, Bot, FileText, ExternalLink, Image as ImageIcon, Paperclip } from 'lucide-react';
import { Message } from '@/app/types/chat';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface ChatBubbleProps {
  message: Message;
  user: SupabaseUser | null;
  onDocumentClick: (messageId: string, document: Message['document']) => void;
  isError?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  user,
  onDocumentClick,
  isError = false,
}) => {
  const renderFileContent = (fileData: any) => {
    if (!fileData) return null;
    return (
      <div className="mt-3 pt-2">
        {/* Image Files */}
        {fileData.metadata?.type?.startsWith('image/') && (
          <div className="space-y-2">
            <img 
              src={fileData.fileUrl} 
              alt={fileData.fileName}
              className="max-w-full h-auto rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '300px' }}
              onClick={() => window.open(fileData?.fileUrl, '_blank')}
            />
            <div className="flex items-center space-x-2 text-xs opacity-75">
              <ImageIcon className="w-3 h-3" />
              <span>{fileData.fileName}</span>
              <span>({(fileData.metadata.size / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
        )}
        {/* PDF Files */}
        {fileData.metadata?.type === 'application/pdf' && (
          <div className="space-y-2 max-w-[300px]">
            <div 
              className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors w-full"
              onClick={() => window.open(fileData?.fileUrl, '_blank')}
            >
              <div className="flex-shrink-0">
                <FileText className="w-8 h-8 text-red-600" />
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
        {/* Text Files */}
        {(fileData.metadata?.type?.startsWith('text/') || 
          fileData.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i)) && (
          <div className="space-y-2 max-w-[300px]">
            <div 
              className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => window.open(fileData?.fileUrl, '_blank')}
            >
              <div className="flex-shrink-0">
                <FileText className="w-8 h-8 text-green-600" />
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
        {/* Generic File Fallback */}
        {fileData.metadata?.type && 
        !fileData.metadata.type.startsWith('image/') && 
        fileData.metadata.type !== 'application/pdf' && 
        !fileData.metadata.type.startsWith('text/') && 
        !fileData.fileName?.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv)$/i) && (
          <div className="space-y-2 max-w-[300px]">
            <div 
              className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => window.open(fileData?.fileUrl, '_blank')}
            >
              <div className="flex-shrink-0">
                <Paperclip className="w-8 h-8 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileData.fileName}
                </p>
                <p className="text-xs text-gray-600">
                  {fileData.metadata.type} • {(fileData.metadata.size / 1024).toFixed(1)} KB
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
  <div className="flex items-center">
    <span className="text-sm text-gray-300">Generating</span>
    <span className="flex items-center ml-2 space-x-1">
      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
    </span>
  </div>
);



  // Initial loading bubble (stream start)
  if ( message.id === 'loading') {
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
          } ${message.document?.content ? 'cursor-pointer hover:shadow-xl transition-shadow hover:border-white/50' : ''}`}
          onClick={() => message.document?.content && onDocumentClick(message.id, message.document)}
        >
          <div className="prose prose-invert max-w-none text-sm leading-relaxed">
            {message?.content ? (
              message.content
            ) : (
             renderGeneratingLoading()
            )}
          </div>
          {renderFileContent(message.file_data)}
          {message?.document?.content && (
            <div className="mt-2 pt-2 border-t border-gray-600 flex items-center space-x-2 text-xs text-gray-300">
              <FileText className="w-3 h-3" />
              <span>Click to view document: <span className='italic'>"{message.document.title || 'Untitled Document'}"</span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
