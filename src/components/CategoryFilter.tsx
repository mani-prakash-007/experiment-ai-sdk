import React from 'react';

interface CategoryFilterProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  fileCounts?: Record<string, number>;
  className?: string;
}

const categories = [
  { id: 'all', label: 'All Files', icon: '📁' },
  { id: 'image', label: 'Images', icon: '🖼️' },
  { id: 'document', label: 'Documents', icon: '📄' },
  { id: 'other', label: 'Other', icon: '📎' },
];

export function CategoryFilter({ 
  currentCategory, 
  onCategoryChange, 
  fileCounts = {},
  className = '' 
}: CategoryFilterProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {categories.map((category) => {
        const count = fileCounts[category.id] || 0;
        const isActive = currentCategory === category.id;
        
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`inline-flex items-center px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 backdrop-blur-sm border ${
              isActive
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                : 'bg-gray-800/50 hover:bg-gray-700/70 text-gray-300 hover:text-white border-gray-700 hover:border-gray-600'
            }`}
          >
            <span className="mr-2 text-base">{category.icon}</span>
            <span>{category.label}</span>
            {count > 0 && (
              <span className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}