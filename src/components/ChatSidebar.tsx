'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MessageSquare, Trash2, X, Search, XCircle, User as UserIcon, LogOut, Menu, Plus } from 'lucide-react';
import { useChatSessions } from '@/app/hooks/useChatSessions';
import { useAuth } from '@/app/hooks/useAuth';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

export const ChatSidebar: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const params = useParams();
  const activeSessionId = params.sessionId as string | null;

  const { user } = useAuth();
  const {
    sessions,
    loading,
    createSession,
    deleteSession,
    refreshSessions
  } = useChatSessions(user?.id);

  const handleNewSession = async () => {
    const sessionId = await createSession();
    if (sessionId) {
      router.push(`/chat/${sessionId}`);
      toast.success('New session created');
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    // Navigate to the session URL
    router.push(`/chat/${sessionId}`);
    
    // Don't auto-close on larger screens
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
    
    if (activeSessionId === sessionId) {
      sessions.filter(s => s.id !== sessionId);
      router.push('/chat');
    }
    toast.success('Session deleted');
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) 
        setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Responsive behavior: auto-open on desktop, closed by default on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (sidebarOpen ) {
      refreshSessions();
    }
  }, [ sidebarOpen]);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sticky controls when sidebar is closed */}
      {!sidebarOpen && (
        <div className="fixed z-50 flex flex-col space-y-3 px-5 py-2 rounded-2xl bg-gray-800/10 backdrop-blur-md mt-2 ml-2">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Sidebar"
            className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={handleNewSession}
            aria-label="New Session"
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        flex flex-col h-full bg-gray-900 border-r border-gray-700 
        transition-all duration-300 ease-in-out z-50
        ${sidebarOpen 
          ? 'w-80 fixed lg:relative lg:translate-x-0' 
          : 'w-0 lg:w-0'
        }
        ${sidebarOpen && 'lg:relative'}
        overflow-hidden
      `}>
        <div className="flex flex-col h-full min-w-80">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">Chat Sessions</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200 cursor-pointer"
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
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
              <div className="mt-2 text-xs text-gray-400">
                {filteredSessions.length} of {sessions.length} sessions
              </div>
            )}
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
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
                      onClick={() => setSearchTerm('')}
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
                    className={`group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-500 transform hover:scale-[1.05] hover:shadow-md ${
                      activeSessionId === session.id
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-[1.01]'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    onClick={() => handleSessionSelect(session.id)}
                    style={{ animationDelay: `${index * 50}ms` }}
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
                        if (confirm('Are you sure you want to delete this session?')) 
                          handleSessionDelete(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-all duration-200 transform hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="border-t border-gray-600 bg-gray-800">
            <div className="relative h-full w-full" ref={dropdownRef}>
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 focus:outline-none h-full w-full px-4 py-3 cursor-pointer"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user?.user_metadata?.avatar_url} alt="avatar" className="w-10 h-10 rounded-full" />
                ) : (
                  <UserIcon className="w-8 h-8 text-white" />
                )}
                <div className="text-left text-white text-sm">
                  <div>{user?.email}</div>
                  <div className="text-gray-300 text-xs uppercase">{user?.app_metadata?.provider}</div>
                </div>
              </button>
              {open && (
                <div className="absolute bottom-full left-1 mb-2 w-48 bg-gray-700 border border-gray-600 rounded-md shadow-lg overflow-hidden z-50">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/auth/signout', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                        });

                        if (response.ok) {
                          // Redirect to signin page after successful signout
                          router.push('/auth/signin');
                        } else {
                          const data = await response.json();
                          toast.error('Sign out failed: ' + (data.error || 'Unknown error'));
                        }
                      } catch (error) {
                        console.error('Sign out error:', error);
                        toast.error('Sign out failed');
                      }
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-600 text-white text-sm"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
