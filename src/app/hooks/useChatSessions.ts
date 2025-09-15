import { useState, useEffect } from 'react';
import { createClientForBrowser } from '@/utils/supabase/client';
import { ChatSession } from '@/app/types/chat';
import { toast } from 'sonner';

export const useChatSessions = (userId: string | undefined) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientForBrowser();

  const fetchSessions = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Session fetch failed')
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const createSession = async (): Promise<string | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: 'Untitled Session'
        })
        .select()
        .single();

      if (error) throw error;
      
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
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Session deletion failed')
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ 
          title,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      setSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s)
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
