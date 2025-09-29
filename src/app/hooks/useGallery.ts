import { useState, useEffect, useCallback } from 'react';
import type { FileWithMetadata, FilesResponse } from '@/app/types/chat';

export interface UseGalleryOptions {
  initialPage?: number;
  limit?: number;
  category?: string;
}

export interface UseGalleryReturn {
  files: FileWithMetadata[];
  loading: boolean;
  error: string | null;
  pagination: FilesResponse['pagination'] | null;
  currentPage: number;
  category: string;
  // Actions
  loadFiles: (page?: number, newCategory?: string) => Promise<void>;
  setPage: (page: number) => void;
  setCategory: (category: string) => void;
  generatePresignedUrl: (storagePath: string) => Promise<string | null>;
  refresh: () => Promise<void>;
}

export function useGallery({
  initialPage = 1,
  limit = 20,
  category = 'all'
}: UseGalleryOptions = {}): UseGalleryReturn {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<FilesResponse['pagination'] | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentCategory, setCurrentCategory] = useState(category);

  const loadFiles = useCallback(async (page = currentPage, newCategory = currentCategory) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (newCategory && newCategory !== 'all') {
        params.append('category', newCategory);
      }

      const response = await fetch(`/api/files?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data: FilesResponse = await response.json();
      setFiles(data.files);
      setPagination(data.pagination);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setFiles([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentCategory, limit]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
    loadFiles(page, currentCategory);
  }, [loadFiles, currentCategory]);

  const setCategory = useCallback((newCategory: string) => {
    setCurrentCategory(newCategory);
    setCurrentPage(1); // Reset to first page when changing category
    loadFiles(1, newCategory);
  }, [loadFiles]);

  const generatePresignedUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath,
          expiresIn: 3600, // 1 hour
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate presigned URL');
      }

      const data = await response.json();
      return data.signedUrl;
    } catch (err) {
      console.error('Error generating presigned URL:', err);
      return null;
    }
  }, []);

  const refresh = useCallback(() => {
    return loadFiles(currentPage, currentCategory);
  }, [loadFiles, currentPage, currentCategory]);

  useEffect(() => {
    loadFiles();
  }, []); // Only run on mount

  return {
    files,
    loading,
    error,
    pagination,
    currentPage,
    category: currentCategory,
    loadFiles,
    setPage,
    setCategory,
    generatePresignedUrl,
    refresh,
  };
}