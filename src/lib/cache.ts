import { createHash } from 'node:crypto';
import type { NormalizedSkill, Repo } from './types';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

let db: DatabaseSync | undefined;
function database() {
  if (!db) {
    const dir = join(process.cwd(), 'data');
    mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(join(dir, 'skillora.sqlite'));
    db.exec('CREATE TABLE IF NOT EXISTS extraction_cache (username_key TEXT PRIMARY KEY, revision TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');
  }
  db.prepare('DELETE FROM extraction_cache WHERE created_at < ?').run(new Date(Date.now() - 7 * 86400000).toISOString());
  return db;
}

export function revisionFor(repos: Pick<Repo, 'name' | 'stars' | 'pushedAt' | 'languages'>[]) {
  const digest = createHash('sha256');
  for (const repo of repos) {
    digest.update(repo.name);
    digest.update(String(repo.stars));
    digest.update(repo.pushedAt ?? 'never');
    for (const lang of repo.languages) digest.update(`${lang.name}:${lang.bytes};`);
    digest.update('\n');
  }
  return digest.digest('hex');
}

export function cachedExtraction(username: string, revision: string): NormalizedSkill[] | null {
  const row = database().prepare('SELECT revision, payload FROM extraction_cache WHERE username_key = ?').get(username.toLowerCase()) as { revision: string; payload: string } | undefined;
  return row && row.revision === revision ? JSON.parse(row.payload) : null;
}

export function saveExtraction(username: string, revision: string, payload: NormalizedSkill[]) {
  database().prepare('INSERT INTO extraction_cache (username_key, revision, payload, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(username_key) DO UPDATE SET revision = excluded.revision, payload = excluded.payload, created_at = excluded.created_at')
    .run(username.toLowerCase(), revision, JSON.stringify(payload), new Date().toISOString());
}
