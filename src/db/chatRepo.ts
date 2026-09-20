import { getDatabase } from './database';

export type StoredMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
};

export async function createChat(title = 'New chat') {
  const db = await getDatabase();
  const now = Date.now();
  const result = await db.runAsync(
    'INSERT INTO chats (title, created_at, updated_at) VALUES (?, ?, ?)',
    title,
    now,
    now
  );
  return Number(result.lastInsertRowId);
}

export async function addMessage(chatId: number, role: 'user' | 'assistant', content: string) {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO messages (chat_id, role, content, created_at) VALUES (?, ?, ?, ?)',
    chatId,
    role,
    content,
    now
  );
  await db.runAsync('UPDATE chats SET updated_at = ? WHERE id = ?', now, chatId);
}

export async function getLatestChat() {
  const db = await getDatabase();
  return db.getFirstAsync<{ id: number; title: string }>(
    'SELECT id, title FROM chats ORDER BY updated_at DESC LIMIT 1'
  );
}

export async function getMessages(chatId: number) {
  const db = await getDatabase();
  return db.getAllAsync<StoredMessage>(
    'SELECT id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY id ASC',
    chatId
  );
}

export async function clearAllChats() {
  const db = await getDatabase();
  await db.execAsync('DELETE FROM messages; DELETE FROM chats;');
}
