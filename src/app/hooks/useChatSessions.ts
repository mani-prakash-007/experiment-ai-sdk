import { useState, useEffect, useCallback } from 'react';
import { ChatSession } from '@/app/types/chat';
import { toast } from 'sonner';

export const useChatSessions = (userId: string | undefined) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const { sessions: fetchedSessions } = await response.json();
      setSessions(fetchedSessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Session fetch failed')
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (): Promise<string | null> => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Untitled Session'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setSessions(prev => [data, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Session creation failed')
      return null;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Session deletion failed')
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to update session title');
      }

      const updatedSession = await response.json();
      setSessions(prev => 
        prev.map(s => s.id === sessionId ? updatedSession : s)
      );
    } catch (error) {
      console.error('Error updating session title:', error);
      toast.error('Session title updation failed')
    }
  };

  return {
    sessions,
    loading,
    createSession,
    deleteSession,
    updateSessionTitle,
    refreshSessions: fetchSessions
  };
};
