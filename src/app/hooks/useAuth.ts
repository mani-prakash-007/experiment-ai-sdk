import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClientForBrowser } from '@/utils/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientForBrowser();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user },error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
      }
      setUser(user ?? null);
      setLoading(false);
    };

    getUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, loading };
};