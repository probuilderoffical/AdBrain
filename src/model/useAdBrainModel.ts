import { models, useLLMChatSession } from 'react-native-executorch';

const SYSTEM_PROMPT = [
  'You are AdBrain One, an on-device ecommerce marketing assistant.',
  'Your job is to turn product information and customer reviews into clear marketing insights.',
  'Prefer concise, structured answers with separate sections for pains, desires, objections, ad angles and hooks.',
  'Do not pretend to have data that the user did not provide.',
  'When reviews are provided, ground recommendations in repeated customer language.',
  'Keep wording simple enough for a beginner marketer to understand.',
].join(' ');

export function useAdBrainModel() {
  const session = useLLMChatSession(models.llm.QWEN3_0_6B.DEFAULT, {
    initialMessages: [{ role: 'system', content: SYSTEM_PROMPT }],
    generationConfig: {
      temperature: 0.35,
      maxNewTokens: 420,
    },
  });

  async function ask(message: string, onToken?: (token: string) => void) {
    if (!session.isReady || !session.sendMessage) return null;
    const turn = await session.sendMessage(message, onToken);
    const last = turn.messages.at(-1);
    return typeof last?.content === 'string' ? last.content : null;
  }

  return {
    ask,
    isReady: session.isReady,
    downloadProgress: session.downloadProgress,
    error: session.error,
    stop: session.stop,
  };
}
