import { useCallback } from 'react';
import { authClient } from '@/auth/client';
import { ADBRAIN_API_URL, sendAdBrainMessage } from '@/api/adbrain';

type ModelStatus = 'checking' | 'ready' | 'error';

export function useAdBrainModel() {
  const { data: session, isPending } = authClient.useSession();

  const ask = useCallback(async (message: string, onToken?: (token: string) => void) => {
    const result = await sendAdBrainMessage({ message });
    if (onToken) onToken(result.answer);
    return result.answer;
  }, []);

  return {
    ask,
    retry: async () => undefined,
    resetConversation: () => undefined,
    status: (isPending ? 'checking' : ADBRAIN_API_URL && session?.user ? 'ready' : 'error') as ModelStatus,
    isReady: Boolean(!isPending && ADBRAIN_API_URL && session?.user),
    downloadProgress: 100,
    error: !ADBRAIN_API_URL
      ? 'Cloud backend URL is not configured yet.'
      : !session?.user
        ? 'Sign in to use AdBrain One.'
        : null,
    modelName: 'AdBrain One · Cloud',
    modelSize: 'Workers AI',
    isAuthenticated: Boolean(session?.user),
    user: session?.user ?? null,
  };
}
