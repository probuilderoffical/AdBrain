import type { MemoryItem } from '@/db/memoryRepo';

export function buildAdBrainPrompt(userMessage: string, memories: MemoryItem[]) {
  if (!memories.length) return userMessage;

  const context = memories
    .map((item) => '- ' + item.kind + ': ' + item.content)
    .join('\n');

  return [
    'Relevant saved context for this user/project:',
    context,
    '',
    'Current request:',
    userMessage,
    '',
    'Use saved context only when relevant. Do not mention memory unless it helps the answer.',
  ].join('\n');
}
