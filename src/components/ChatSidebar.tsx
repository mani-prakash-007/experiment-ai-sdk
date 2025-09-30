'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MessageSquare, Trash2, Search, XCircle, User as UserIcon, LogOut, Plus, LibraryBig } from 'lucide-react';
import { useChatSessions } from '@/app/hooks/useChatSessions';
import { useAuth } from '@/app/hooks/useAuth';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { signOut } from '@/utils/actions';

export const ChatSidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDropdownOpen, setExpandedDropdownOpen] = useState(false);
  const [newSessionLoading, setNewSessionLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const expandedDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const params = useParams();
  const activeSessionId = params.sessionId as string | null;

  const { user } = useAuth();
  const {
    sessions,
    loading,
    createSession,
    deleteSession
  } = useChatSessions(user?.id);

  const handleNewSession = async () => {
    setNewSessionLoading(true);
    try {
      const sessionId = await createSession();
      if (sessionId) {
        router.push(`/chat/${sessionId}`);
        toast.success('New session created');
      }
    } finally {
      setNewSessionLoading(false);
    }
  };

  const handleGalleryClick = () => {
    setGalleryLoading(true);
    router.push('/chat/gallery');
    // Reset loading state after a short delay to account for navigation
    setTimeout(() => setGalleryLoading(false), 1000);
  };

  const handleSessionSelect = (sessionId: string) => {
    router.push(`/chat/${sessionId}`);
  };

  const handleSessionDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
    
    if (activeSessionId === sessionId) {
      sessions.filter(s => s.id !== sessionId);
      router.push('/chat');
    }
    toast.success('Session deleted');
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 300); // Small delay to prevent flickering
  };

  const filteredSessions = useMemo(() =>
    !searchTerm.trim()
      ? sessions
      : sessions.filter(s =>
          s.title.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [sessions, searchTerm]
  );

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span key={idx} className="bg-yellow-400 text-gray-900 rounded px-1">{part}</span>
      ) : part
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = startOfNow.getTime() - startOfDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Close expanded dropdown if clicking outside
      if (expandedDropdownRef.current && !expandedDropdownRef.current.contains(target)) {
        setExpandedDropdownOpen(false);
      }
    };
    
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);



  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={sidebarRef}
      className={`
        relative h-full bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 border-r border-gray-700/50
        transition-all duration-300 ease-in-out shadow-2xl
        ${isExpanded ? 'w-80' : 'w-16'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Always Visible Icon Bar */}
      <div className="absolute left-0 top-0 w-16 h-full bg-gray-900/80 backdrop-blur-sm flex flex-col z-10 border-r border-gray-600/30">
        {/* Top Actions */}
        <div className="flex flex-col items-center py-4 space-y-3">
          {/* New Session - Always Visible */}
          <button
            onClick={handleNewSession}
            disabled={newSessionLoading}
            className={`relative group p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-blue-500/25 ${
              newSessionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="New Session"
          >
            {newSessionLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-800/90 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-1.5 transition-all duration-200 whitespace-nowrap z-50 border border-gray-600/50 ${
              isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
            }`}>
              New Session
            </span>
          </button>
          
          {/* File Gallery */}
          <button
            onClick={handleGalleryClick}
            disabled={galleryLoading}
            className={`relative group p-3 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg ${
              galleryLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="File Gallery"
          >
            {galleryLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <LibraryBig className="w-5 h-5" />
            )}
            <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-800/90 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-1.5 transition-all duration-200 whitespace-nowrap z-50 border border-gray-600/50 ${
              isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
            }`}>
              File Gallery
            </span>
          </button>

          {/* Sessions Indicator */}
          <div className="relative group p-3 bg-gray-700/60 text-gray-300 rounded-xl transition-all duration-200">
            <MessageSquare className="w-5 h-5" />
            {sessions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {sessions.length > 9 ? '9+' : sessions.length}
              </span>
            )}
            <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-800/90 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-1.5 transition-all duration-200 whitespace-nowrap z-50 border border-gray-600/50 ${
              isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {sessions.length} Sessions
            </span>
          </div>
        </div>

        {/* User Profile - Always Visible at Bottom */}
        <div className="mt-auto pb-4 flex flex-col items-center">
          <div className="relative group">
            <div className=" bg-gray-700/80 rounded-xl transition-all duration-200 relative">
              {user?.user_metadata?.avatar_url ? (
                <img src={user?.user_metadata?.avatar_url} alt="avatar" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
              )}
              
              {/* Tooltip - Only show when sidebar is collapsed */}
              {!isExpanded && (
                <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-800/90 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 border border-gray-600/50 pointer-events-none">
                  {user?.email || 'Profile'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Sidebar Content */}
      <div className={`
        flex flex-col h-full ml-16 transition-all duration-300 relative z-20
        ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-600/30">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Sessions
          </h2>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-600/30">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNewSession}
              disabled={newSessionLoading}
              className={`flex items-center gap-2 p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25 ${
                newSessionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {newSessionLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">New</span>
            </button>
            <button
              onClick={handleGalleryClick}
              disabled={galleryLoading}
              className={`flex items-center gap-2 p-3 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-xl transition-all duration-200 hover:scale-105 ${
                galleryLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {galleryLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <LibraryBig className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Gallery</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-600/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 "
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                {filteredSessions.length} of {sessions.length}
              </span>
              <span>sessions found</span>
            </div>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p>Loading sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <div className="bg-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50 text-gray-500" />
                {searchTerm ? (
                  <>
                    <p className="font-medium">No sessions found</p>
                    <p className="text-xs mt-1 text-gray-500">Try a different search term</p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-3 text-blue-400 hover:text-blue-300 text-sm underline transition-colors duration-200"
                    >
                      Clear search
                    </button>
                  </>
                ) : sessions.length === 0 ? (
                  <>
                    <p className="font-medium">No chat sessions yet</p>
                    <p className="text-xs mt-1 text-gray-500">Create your first session to get started</p>
                    <button
                      onClick={handleNewSession}
                      disabled={newSessionLoading}
                      className={`mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200 flex items-center gap-2 ${
                        newSessionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      {newSessionLoading && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      )}
                      Create Session
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredSessions.map((session, index) => (
                <div
                  key={session.id}
                  className={`group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    activeSessionId === session.id
                      ? 'bg-gradient-to-r from-blue-600/20 to-blue-700/20 text-white border border-blue-500/30 shadow-lg backdrop-blur-sm'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white backdrop-blur-sm'
                  }`}
                  onClick={() => handleSessionSelect(session.id)}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={`p-2 rounded-lg mr-3 ${
                    activeSessionId === session.id 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-600/50 group-hover:text-gray-300'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">
                      {highlightSearchTerm(session.title, searchTerm)}
                    </div>
                    <div className={`text-xs opacity-75 transition-colors duration-200 ${
                      activeSessionId === session.id ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatDate(session.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this session?')) 
                        handleSessionDelete(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 transform hover:scale-110 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile Section - Expanded Sidebar */}
        <div className="p-2 border-t border-gray-600/30 mt-auto">
          <div className="relative" ref={expandedDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedDropdownOpen(!expandedDropdownOpen);
              }}
              className="w-full flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-200 group cursor-pointer"
            >
              <div className="flex-1 text-left min-w-0">
                <div className="text-white text-sm font-medium truncate">{user?.email}</div>
                <div className="text-gray-400 text-xs capitalize">{user?.app_metadata?.provider || 'Email'}</div>
              </div>
            </button>

            {/* Dropdown for Expanded Sidebar */}
            {expandedDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden z-[70]">
                <div className="p-1">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setExpandedDropdownOpen(false);
                      try {
                        await signOut();
                      } catch (error) {
                        console.error('Sign out error:', error);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-red-500/10 hover:text-red-400 text-gray-300 text-sm transition-colors duration-200 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
