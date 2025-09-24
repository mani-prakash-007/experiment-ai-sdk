'use client';

import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChatSession } from '@/app/types/chat';

interface WelcomeScreenProps {
  createSession: () => Promise<string | null>;
  refreshSessions : () => Promise<void>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ createSession, refreshSessions }) => {
  const router = useRouter();

  const handleNewSession = async () => {
    const newSessionId = await createSession();
    if (newSessionId) {
      router.push(`/chat/${newSessionId}`);
      toast.success('New session created');
    }
    refreshSessions()
  };

  return (
    <div className="w-full flex items-center justify-center h-full text-gray-400 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center max-w-md mx-auto p-8">
        <MessageSquare className="w-20 h-20 mx-auto mb-6 opacity-50" />
        <h2 className="text-2xl font-bold text-white mb-4">Welcome to AI Canvas Chat</h2>
        <p className="text-lg mb-6">Start a conversation with AI that can generate and edit documents in real-time.</p>
        <button
          onClick={handleNewSession}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto cursor-pointer active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Start New Chat</span>
        </button>
      </div>
    </div>
  );
};
