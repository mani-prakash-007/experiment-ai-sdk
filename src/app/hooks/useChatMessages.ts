import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const fetchMessages = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sessionId,
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await fetch(`/api/messages?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const { messages: fetchedMessages, hasMore: moreAvailable } = await response.json();
      
      if (reset || pageNum === 0) {
        setMessages(fetchedMessages);
      } else {
        setMessages(prev => [...fetchedMessages, ...prev]);
      }
      setHasMore(moreAvailable);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Message retrieval failed');
      router.push('/chat');
    } finally {
      setLoading(false);
    }
  }, [sessionId, pageSize, router]);

  const loadMoreMessages = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(page + 1, false);
    }
  }, [fetchMessages, loading, hasMore, page]);

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'created_at'>) => {
    if (!sessionId) return;
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          session_id: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      toast.error('Message adding failed');
      return null;
    }
  }, [sessionId]);

  const updateMessage = useCallback(async (messageId: string, updates: Partial<Message>) => {
    try {
      // First update local state immediately for smooth UI
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, ...updates } : m)
      );

      // Then update database via API
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
        
      if (!response.ok) {
        // Revert local state if API call fails
        setMessages(prev => 
          prev.map(m => m.id === messageId ? { ...m, ...Object.fromEntries(Object.keys(updates).map(key => [key, undefined])) } : m)
        );
        throw new Error('Failed to update message');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Message updation failed');
    }
  }, []);

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
