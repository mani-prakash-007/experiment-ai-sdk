'use client';

import React, { useMemo, useState } from 'react';
import { useGallery } from '@/app/hooks/useGallery';
import { FilePreview } from '@/components/FilePreview';
import { CategoryFilter } from '@/components/CategoryFilter';
import { Pagination } from '@/components/Pagination';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { SearchAndSort } from '@/components/SearchAndSort';

const GalleryPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const {
    files,
    loading,
    error,
    pagination,
    currentPage,
    category,
    setPage,
    setCategory,
    generatePresignedUrl,
    refresh
  } = useGallery({
    limit: 20
  });

  // Filter and sort files based on search and sort criteria
  const filteredAndSortedFiles = useMemo(() => {
    let result = files;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.originalName.toLowerCase().includes(query) ||
        file.type.toLowerCase().includes(query) ||
        file.category.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'newest':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'name-asc':
          return a.originalName.localeCompare(b.originalName);
        case 'name-desc':
          return b.originalName.localeCompare(a.originalName);
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });

    return result;
  }, [files, searchQuery, sortBy]);

  // Calculate file counts for each category (based on all files, not filtered)
  const fileCounts = useMemo(() => {
    const counts: Record<string, number> = { all: files.length };
    files.forEach(file => {
      counts[file.category] = (counts[file.category] || 0) + 1;
    });
    return counts;
  }, [files]);

  const handleRetry = () => {
    refresh();
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-8 max-w-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-red-400 mb-3">
              Error Loading Files
            </h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
      </div>
    );
  }

  const displayedFiles = filteredAndSortedFiles;
  const hasSearchResults = searchQuery.trim() && displayedFiles.length > 0;
  const hasNoSearchResults = searchQuery.trim() && displayedFiles.length === 0;

  return (
    <div className="h-full w-full overflow-auto bg-transparent">
      <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">File Gallery</h1>
          <p className="text-gray-400 text-lg">
            {pagination ? (
              <>
                {hasSearchResults && `${displayedFiles.length} results found • `}
                {pagination.totalFiles} files total
              </>
            ) : (
              'Loading files...'
            )}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="self-start sm:self-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-6 py-3 rounded-md transition-colors font-medium flex items-center gap-3 shadow-lg"
        >
          <svg 
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Search and Sort */}
      <SearchAndSort
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortBy}
        onSortChange={setSortBy}
      />

      {/* Category Filter */}
      <CategoryFilter
        currentCategory={category}
        onCategoryChange={setCategory}
        fileCounts={fileCounts}
      />

      {/* Loading State */}
      {loading && <LoadingSkeleton count={20} />}

      {/* No Search Results */}
      {hasNoSearchResults && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-3">
              No files found
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm">
              No files match your search criteria "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors font-medium"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* Empty State - No files at all */}
      {!loading && !searchQuery.trim() && files.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 border border-gray-700 max-w-md">
            <svg className="w-20 h-20 text-gray-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-2xl font-semibold text-white mb-4">
              {category === 'all' ? 'No files uploaded yet' : `No ${category} files found`}
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {category === 'all' 
                ? 'Start a conversation and upload some files to see them here.'
                : `Try switching to a different category or upload some ${category} files.`
              }
            </p>
            {category !== 'all' && (
              <button
                onClick={() => setCategory('all')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors font-medium"
              >
                View All Files
              </button>
            )}
          </div>
        </div>
      )}

      {/* File Grid */}
      {!loading && displayedFiles.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayedFiles.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                onGenerateUrl={generatePresignedUrl}
              />
            ))}
          </div>

          {/* Pagination - only show if not searching */}
          {!searchQuery.trim() && pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onPageChange={setPage}
              className="mt-8"
            />
          )}
        </>
      )}

      {/* Stats Footer */}
      {/* Stats Footer */}
      {!loading && (pagination || displayedFiles.length > 0) && (
        <div className="border-t border-gray-700 pt-6 bg-gray-900/50 backdrop-blur-sm rounded-lg px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-400">
            <div className="font-medium">
              {searchQuery.trim() ? (
                <>Showing {displayedFiles.length} search results</>
              ) : (
                <>Showing {displayedFiles.length} of {pagination?.totalFiles || displayedFiles.length} files</>
              )}
            </div>
            {pagination && !searchQuery.trim() && (
              <div className="font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GalleryPage;