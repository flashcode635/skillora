import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Receipt } from './types';
let db: DatabaseSync | undefined;
function database() {
  if (!db) {
    const dir = join(process.cwd(), 'data');
    mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(join(dir, 'skillora.sqlite'));
    db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS scan_receipts (id TEXT PRIMARY KEY, session_hash TEXT NOT NULL, repository_count INTEGER NOT NULL, skill_count INTEGER NOT NULL, created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS receipt_session ON scan_receipts(session_hash, created_at);');
  }
  db.prepare('DELETE FROM scan_receipts WHERE created_at < ?').run(new Date(Date.now() - 3600000).toISOString());
  return db;
}
const hash = (session: string) => createHash('sha256').update(session).digest('hex');
export function receipts(session: string): Receipt[] {
  return database().prepare('SELECT id, repository_count, skill_count, created_at FROM scan_receipts WHERE session_hash = ? ORDER BY created_at DESC LIMIT 30').all(hash(session)) as Receipt[];
}
export function saveReceipt(session: string, repoCount: number, skillCount: number) {
  database().prepare('INSERT INTO scan_receipts VALUES (?, ?, ?, ?, ?)').run(randomUUID(), hash(session), repoCount, skillCount, new Date().toISOString());
}
export function deleteReceipts(session: string) {
  database().prepare('DELETE FROM scan_receipts WHERE session_hash = ?').run(hash(session));
}
