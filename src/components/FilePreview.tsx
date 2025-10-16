import React, { useState, useEffect, useCallback } from 'react';
import type { FileWithMetadata } from '@/app/types/chat';
import { downloadFile, formatFileSize, getFileTypeColor } from '@/utils/fileUtils';
import Image from 'next/image';

interface FilePreviewProps {
  file: FileWithMetadata;
  onGenerateUrl: (storagePath: string) => Promise<string | null>;
  className?: string;
}

const getFileIcon = (category: string) => {
  const colorClass = getFileTypeColor(category);
  switch (category) {
    case 'image':
      return (
        <svg className={`w-8 h-8 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    case 'document':
      return (
        <svg className={`w-8 h-8 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className={`w-8 h-8 ${colorClass}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
  }
};

export function FilePreview({ file, onGenerateUrl, className = '' }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateUrl = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = await onGenerateUrl(file.storagePath);
      if (url) {
        setPreviewUrl(url);
      } else {
        setError('Failed to generate preview URL');
      }
    } catch {
      setError('Error generating preview');
    } finally {
      setLoading(false);
    }
  }, [onGenerateUrl, file.storagePath]); // Removed 'loading' dependency

  // Automatically generate presigned URL for images - only once per file
  useEffect(() => {
    if (file.category === 'image' && !previewUrl && !loading && !error) {
      handleGenerateUrl();
    }
  }, [file.category, file.storagePath, previewUrl, loading, error, handleGenerateUrl]);

  const handleClick = async () => {
    if (file.category === 'image' && previewUrl) {
      // Open image in new tab
      window.open(previewUrl, '_blank');
    } else if (file.category === 'document' || file.category === 'other') {
      // Generate URL and open document/file in new tab
      if (previewUrl) {
        window.open(previewUrl, '_blank');
      } else {
        const url = await onGenerateUrl(file.storagePath);
        if (url) {
          setPreviewUrl(url);
          window.open(url, '_blank');
        }
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (previewUrl) {
      await downloadFile(previewUrl, file.originalName);
    } else {
      // Generate URL first, then download
      const url = await onGenerateUrl(file.storagePath);
      if (url) {
        await downloadFile(url, file.originalName);
      }
    }
  };

  return (
    <div 
      className={`group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-800/70 hover:border-gray-600 hover:shadow-xl transition-all duration-300 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className="relative aspect-square bg-gray-900/30 flex items-center justify-center">
        {file.category === 'image' && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.originalName}
            className="w-full h-full object-cover"
            onError={() => setError('Failed to load image')}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            {getFileIcon(file.category)}
            <span className="text-xs text-gray-400 mt-2 text-center truncate w-full px-2">
              {file.originalName}
            </span>
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-red-900/30 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xs text-red-300 text-center px-2">{error}</span>
          </div>
        )}

        {/* Overlay with actions - Desktop hover and mobile tap */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex space-x-3">
            <button
              onClick={handleClick}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation shadow-lg"
            >
              {file.category === 'image' ? 'View' : 'Open'}
            </button>
            <button
              onClick={handleDownload}
              className="bg-gray-700 hover:bg-gray-600 active:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation shadow-lg"
            >
              Download
            </button>
          </div>
        </div>

        {/* Mobile-friendly action indicators */}
        <div className="absolute top-3 right-3 md:hidden">
          <div className="bg-black/80 backdrop-blur-sm rounded-full p-2">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-900/50 backdrop-blur-sm">
        <h3 className="font-medium text-sm text-white truncate" title={file.originalName}>
          {file.originalName}
        </h3>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
          <span className="font-medium">{formatFileSize(file.size)}</span>
          <span className="capitalize bg-gray-700 px-2 py-1 rounded text-gray-300">{file.category}</span>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {new Date(file.uploadedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}