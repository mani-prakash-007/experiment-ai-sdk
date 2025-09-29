'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';


export const WelcomeScreen: React.FC = () => {


  return (
    <div className="w-full flex items-center justify-center h-full text-gray-400 ">
      <div className="text-center max-w-md mx-auto p-8">
        <MessageSquare className="w-20 h-20 mx-auto mb-6 opacity-50" />
        <h2 className="text-2xl font-bold text-white mb-4">Welcome to AI Canvas Chat</h2>
        <p className="text-lg mb-6">Start a conversation with AI that can generate and edit documents in real-time.</p>
      </div>
    </div>
  );
};
