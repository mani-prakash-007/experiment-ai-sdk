import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ count = 12, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-square bg-gray-900/50"></div>
          <div className="p-4 space-y-3 bg-gray-900/30">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-700 rounded w-1/3"></div>
              <div className="h-3 bg-gray-700 rounded w-1/4"></div>
            </div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}