import { getDatabase } from './database';

export type MemoryItem = {
  id: number;
  kind: string;
  content: string;
  weight: number;
};

export async function addMemory(kind: string, content: string, weight = 1) {
  const clean = content.trim();
  if (!clean) return;
  const db = await getDatabase();
  const now = Date.now();

  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM memories WHERE kind = ? AND content = ? AND active = 1 LIMIT 1',
    kind,
    clean
  );

  if (existing) {
    await db.runAsync(
      'UPDATE memories SET weight = MIN(weight + 0.2, 5), updated_at = ? WHERE id = ?',
      now,
      existing.id
    );
    return;
  }

  await db.runAsync(
    'INSERT INTO memories (kind, content, weight, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
    kind,
    clean,
    weight,
    now,
    now
  );
}

export async function getTopMemories(limit = 12) {
  const db = await getDatabase();
  return db.getAllAsync<MemoryItem>(
    'SELECT id, kind, content, weight FROM memories WHERE active = 1 ORDER BY weight DESC, updated_at DESC LIMIT ?',
    limit
  );
}

export async function clearMemories() {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM memories');
}

export function extractSimpleMemories(text: string) {
  const out: Array<{ kind: string; content: string }> = [];
  const normalized = text.trim();

  const brand = normalized.match(/(?:my brand is|brand name is|mera brand(?: ka naam)?(?: hai)?)\s+([A-Za-z0-9][A-Za-z0-9 _-]{1,40})/i);
  if (brand?.[1]) out.push({ kind: 'brand', content: brand[1].trim() });

  const audience = normalized.match(/(?:target audience is|target audience|audience is|target kar(?:na|ta) hai)\s+([^.!?]{3,100})/i);
  if (audience?.[1]) out.push({ kind: 'audience', content: audience[1].trim() });

  const tone = normalized.match(/(?:tone|style)\s+(?:should be|is|rakhna|rakho)\s+([^.!?]{3,70})/i);
  if (tone?.[1]) out.push({ kind: 'tone', content: tone[1].trim() });

  return out;
}
