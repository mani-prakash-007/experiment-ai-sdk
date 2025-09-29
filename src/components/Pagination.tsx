import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  className?: string;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  hasNextPage, 
  hasPrevPage,
  className = '' 
}: PaginationProps) {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <nav className={`flex items-center justify-center space-x-2 ${className}`} aria-label="Pagination">
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage}
        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg hover:bg-gray-700/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-label="Go to previous page"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page numbers */}
      <div className="flex items-center space-x-1">
        {getVisiblePages().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-4 py-2 text-sm font-medium text-gray-400">
                {page}
              </span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  page === currentPage
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-300 bg-gray-800/50 backdrop-blur-sm border border-gray-600 hover:bg-gray-700/70 hover:text-white'
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg hover:bg-gray-700/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-label="Go to next page"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}