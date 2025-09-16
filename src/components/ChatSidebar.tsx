'use client';

import React, { useState, useMemo } from 'react';
import { ChatSession } from '@/app/types/chat';
import { MessageSquare, Trash2, X, Search, XCircle } from 'lucide-react';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  loading: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionDelete,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();

  // Normalize to midnight for day difference
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = startOfNow.getTime() - startOfDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Format time in IST
  const timeInIST = date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) return `Today, ${timeInIST}`;
  if (diffDays === 1) return `Yesterday, ${timeInIST}`;
  if (diffDays < 7) return `${diffDays} days ago, ${timeInIST}`;

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

  // Filter sessions based on search term
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    
    return sessions.filter(session =>
      session.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sessions, searchTerm]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-400 text-gray-900 rounded px-1">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <>
    {
      isOpen && <>
      {/* Backdrop with smooth fade transition */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Sidebar with smooth slide transition */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-gray-900 border-r border-gray-700 z-50
        transform transition-all duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto
        shadow-2xl lg:shadow-none
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">Chat Sessions</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-700 bg-gray-900/95">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
                  w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-10 py-2
                  text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200
                "
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-2 text-xs text-gray-400">
                {filteredSessions.length} of {sessions.length} sessions
              </div>
            )}
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto mb-14">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading sessions...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                {searchTerm ? (
                  <>
                    <p>No sessions found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                    <button
                      onClick={clearSearch}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-xs underline transition-colors duration-200"
                    >
                      Clear search
                    </button>
                  </>
                ) : sessions.length === 0 ? (
                  <>
                    <p>No chat sessions yet</p>
                    <p className="text-xs mt-1">Create a new session to get started</p>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredSessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`
                      group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200
                      transform hover:scale-[1.02] hover:shadow-md
                      ${activeSessionId === session.id 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-[1.01]' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                    onClick={() => onSessionSelect(session.id)}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">
                        {highlightSearchTerm(session.title, searchTerm)}
                      </div>
                      <div className={`text-xs opacity-75 transition-colors duration-200 ${
                        activeSessionId === session.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatDate(session.updated_at)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this session?')) {
                          onSessionDelete(session.id);
                        }
                      }}
                      className="
                        opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 
                        hover:bg-red-500/20 rounded transition-all duration-200
                        transform hover:scale-110
                      "
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className='h-14 border-t border-gray-600 fixed bottom-0 w-full'>
            
          </div>
        </div>
      </div>
    </>
    }
    </>
  );
};
