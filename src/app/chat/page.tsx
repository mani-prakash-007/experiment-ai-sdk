'use client'

import { WelcomeScreen } from '@/components/WelcomeScreen';
import { useChatSessions, } from '../hooks/useChatSessions';
import { useAuth } from '../hooks/useAuth';

export default function ChatPage() {
  const { user } = useAuth()
  const { createSession , refreshSessions } = useChatSessions(user?.id)
  return <WelcomeScreen createSession={createSession} refreshSessions={refreshSessions} />;
}
