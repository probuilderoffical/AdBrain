import { getDatabase } from '@/db/database';

const SIGNAL_VALUES = {
  like: 4,
  dislike: -5,
  save: 3,
  copy: 2,
} as const;

export type FeedbackSignal = keyof typeof SIGNAL_VALUES;

export async function recordFeedback(signal: FeedbackSignal, messageId?: number) {
  const db = await getDatabase();
  const value = SIGNAL_VALUES[signal];
  await db.runAsync(
    'INSERT INTO feedback (message_id, signal, value, created_at) VALUES (?, ?, ?, ?)',
    messageId ?? null,
    signal,
    value,
    Date.now()
  );

  await db.runAsync(
    `INSERT INTO learned_preferences (key, score, samples, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       score = score + excluded.score,
       samples = samples + 1,
       updated_at = excluded.updated_at`,
    'general:' + signal,
    value,
    Date.now()
  );
}
