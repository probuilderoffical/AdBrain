import { getDatabase } from './database';

export type FeedbackSignal = 'like' | 'dislike' | 'save' | 'copy' | 'regenerate' | 'used';

const weights: Record<FeedbackSignal, number> = {
  like: 4,
  dislike: -5,
  save: 3,
  copy: 2,
  regenerate: -2,
  used: 5,
};

export async function recordFeedback(signal: FeedbackSignal, messageId?: number) {
  const db = await getDatabase();
  const value = weights[signal];
  await db.runAsync(
    'INSERT INTO feedback (message_id, signal, value, created_at) VALUES (?, ?, ?, ?)',
    messageId ?? null,
    signal,
    value,
    Date.now()
  );

  const key = 'response.' + signal;
  await db.runAsync(
    `INSERT INTO learned_preferences (key, score, samples, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       score = score + excluded.score,
       samples = samples + 1,
       updated_at = excluded.updated_at`,
    key,
    value,
    Date.now()
  );
}
