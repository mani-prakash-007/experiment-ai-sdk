import { SearchIcon } from 'lucide-react';
import React from 'react';

interface SearchAndSortProps {
  onSearchChange: (search: string) => void;
  onSortChange: (sort: string) => void;
  searchValue: string;
  sortValue: string;
  className?: string;
}

export function SearchAndSort({ 
  onSearchChange, 
  onSortChange, 
  searchValue, 
  sortValue,
  className = '' 
}: SearchAndSortProps) {
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'size-desc', label: 'Largest First' },
    { value: 'size-asc', label: 'Smallest First' },
  ];

  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center ">
         <SearchIcon className='text-gray-400'/>
        </div>
        <input
          type="text"
          placeholder="Search files..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-12 pr-12 py-3 border border-gray-600 rounded-lg bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-white transition-colors"
          >
            <svg className="h-5 w-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <select
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className="appearance-none bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg px-4 py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-w-[180px]"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-800 text-white">
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}