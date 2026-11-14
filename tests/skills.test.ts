import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSkill, normalizeEvidence } from '../src/lib/skills.ts';
import { revisionFor } from '../src/lib/cache.ts';

test('canonical mapping resolves aliases', () => {
  assert.equal(canonicalSkill('golang')?.name, 'Go');
  assert.equal(canonicalSkill('reactjs')?.name, 'React');
  assert.equal(canonicalSkill('k8s')?.name, 'Kubernetes');
  assert.equal(canonicalSkill('definitely-not-a-skill'), null);
});

test('normalization merges bytes and repos, flags topic-only evidence', () => {
  const normalized = normalizeEvidence([
    { name: 'a', topics: ['golang'], languages: [{ name: 'Go', bytes: 700 }, { name: 'Rexx', bytes: 10 }] },
    { name: 'b', topics: [], languages: [{ name: 'Go', bytes: 300 }] },
  ]);
  const go = normalized.find(s => s.name === 'Go')!;
  assert.deepEqual(go.repos.sort(), ['a', 'b']);
  assert.equal(go.bytes, 1000);
  assert.equal(go.topicOnly, false);
  assert.ok(!normalized.some(s => s.name === 'Rexx'), 'sub-5% languages stay out');
});

test('revision changes when repository state changes', () => {
  const repo = { name: 'a', stars: 1, pushedAt: '2026-01-01', languages: [{ name: 'Go', bytes: 5 }] };
  const before = revisionFor([repo]);
  const after = revisionFor([{ ...repo, stars: 2 }]);
  assert.notEqual(before, after);
  assert.equal(before, revisionFor([{ ...repo }]));
});
