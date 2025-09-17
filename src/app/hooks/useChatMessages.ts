import { useState, useEffect, useCallback } from 'react';
import { createClientForBrowser } from '@/utils/supabase/client';
import { Message } from '@/app/types/chat';
import { toast } from 'sonner';

interface UseMessagesProps {
  sessionId: string | null;
  pageSize?: number;
}

export const useChatMessages = ({ sessionId, pageSize = 20 }: UseMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const supabase = createClientForBrowser();

  const fetchMessages = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const from = pageNum * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      const reversedMessages = (data || []).reverse();
      if (reset || pageNum === 0) {
        setMessages(reversedMessages);
      } else {
        setMessages(prev => [...reversedMessages, ...prev]);
      }
      setHasMore((data || []).length === pageSize);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Message retrival failed')
    } finally {
      setLoading(false);
    }
  }, [sessionId, pageSize, supabase]);

  const loadMoreMessages = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(page + 1, false);
    }
  }, [fetchMessages, loading, hasMore, page]);

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'created_at'>) => {
    if (!sessionId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ...message,
          session_id: sessionId
        })
        .select()
        .single();
      if (error) throw error;
      setMessages(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      toast.error('Message adding failed')
      return null;
    }
  }, [sessionId, supabase]);

  const updateMessage = useCallback(async (messageId: string, updates: Partial<Message>) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', messageId)
        .select();
      if (error) throw error;
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, ...updates } : m)
      );
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Message updation failed')
    }
  }, [supabase]);
  // Clear ALL message state before fetching for new session 

    useEffect(() => {
      if (!sessionId) {
        setMessages([]);
        return;
      }

      setMessages([]);
      setPage(0);
      setHasMore(true);

      // Debounce fetching when session changes
      const handler = setTimeout(() => {
        fetchMessages(0, true);
      }, 500);

      return () => clearTimeout(handler);
    }, [sessionId, fetchMessages]);

  return {
    messages,
    loading,
    hasMore,
    loadMoreMessages,
    addMessage,
    updateMessage,
    refreshMessages: () => fetchMessages(0, true)
  };
};
