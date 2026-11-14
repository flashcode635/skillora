import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Isolate the test database so tests never wipe or pollute real ingested jobs.
process.env.SKILLORA_DATA_DIR = mkdtempSync(join(tmpdir(), 'skillora-jobs-test-'));

const { cityMatches, fresherFriendly, matchJob, rankJobs, saveJobs, clearJobs, jobCount } = await import('../src/lib/jobs.ts');
type StoredJob = import('../src/lib/jobs.ts').StoredJob;

const job = (overrides: Partial<StoredJob> = {}): StoredJob => ({
  id: 't:1', source: 'test', title: 'Senior React Developer', company: 'Acme', url: 'https://example.com/1',
  location: 'Bengaluru, India', tags: ['react', 'typescript'], description: 'You need <b>3 years</b> of experience with Node.js and PostgreSQL.',
  posted_at: new Date().toISOString(), ...overrides,
});

test('cityMatches handles Indian city aliases', () => {
  assert.equal(cityMatches('Bengaluru, India', 'bangalore'), true);
  assert.equal(cityMatches('Gurugram, Haryana', 'gurgaon'), true);
  assert.equal(cityMatches('Mumbai, India', 'bengaluru'), false);
  assert.equal(cityMatches('Remote — Worldwide', ''), true);
});

test('fresherFriendly detects junior titles and low experience bars', () => {
  assert.equal(fresherFriendly('Junior Frontend Engineer', ''), true);
  assert.equal(fresherFriendly('Software Engineer', '1 year of experience preferred'), true);
  assert.equal(fresherFriendly('Senior Engineer', 'At least 5 years of experience required'), false);
  assert.equal(fresherFriendly('Backend Developer', 'No experience requirement mentioned'), true);
});

test('matchJob ranks byte-backed skills above topic-only evidence', () => {
  const full = matchJob(job(), [{ name: 'React', topicOnly: false }, { name: 'TypeScript', topicOnly: false }, { name: 'Node.js', topicOnly: false }, { name: 'PostgreSQL', topicOnly: false }]);
  assert.ok(full);
  assert.equal(full.match_pct, 100);
  assert.deepEqual(full.gaps, []);

  const partial = matchJob(job(), [{ name: 'React', topicOnly: false }]);
  assert.ok(partial);
  // React is byte-backed (1) and TypeScript is covered through related
  // evidence (React -> TypeScript, 0.6): (1 + 0.6) / 4 requirements = 40%.
  assert.equal(partial.match_pct, 40);
  assert.ok(partial.related?.includes('TypeScript'));
  assert.ok(partial.gaps.includes('Node.js'));

  const topicOnly = matchJob(job({ title: 'Developer', description: 'plain text', tags: ['react'] }), [{ name: 'React', topicOnly: true }]);
  assert.ok(topicOnly);
  assert.equal(topicOnly.match_pct, 75);

  const none = matchJob(job(), [{ name: 'Go', topicOnly: false }]);
  assert.ok(none);
  assert.equal(none.match_pct, 0);
  assert.equal(matchJob(job({ tags: [], title: 'Consultant', description: 'plain text' }), [{ name: 'Go', topicOnly: false }]), null);
});

test('rankJobs filters by minimum match, city and fresher, and sorts by match then recency', () => {
  clearJobs();
  saveJobs([
    job({ id: 'a', url: 'https://example.com/a', tags: [], title: 'React Developer', description: 'react work', posted_at: new Date(Date.now() - 86400000).toISOString() }),
    job({ id: 'b', url: 'https://example.com/b', tags: [], title: 'React Developer', description: 'react work', posted_at: new Date().toISOString() }),
    job({ id: 'c', url: 'https://example.com/c', tags: [], title: 'Go Developer', description: 'go work', location: 'Pune, India', posted_at: new Date(Date.now() - 3600000).toISOString() }),
  ]);
  const skills = [{ name: 'React', topicOnly: false }, { name: 'Go', topicOnly: false }];
  const all = rankJobs(skills, {});
  assert.equal(all.total, 3);
  assert.deepEqual(all.results.map(r => r.id), ['b', 'c', 'a']);
  assert.equal(rankJobs(skills, { minMatch: 100 }).results.length, 3);
  assert.deepEqual(rankJobs([{ name: 'React', topicOnly: false }], { minMatch: 100 }).results.map(r => r.id), ['b', 'a']);
  assert.ok(rankJobs(skills, { minMatch: 10 }).results.length > 0);
  assert.deepEqual(rankJobs(skills, { city: 'pune' }).results.map(r => r.id), ['c']);
  assert.equal(rankJobs(skills, { fresher: true }).results.length, 3);
  assert.ok(jobCount() >= 3);
});
