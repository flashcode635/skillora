import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { NormalizedSkill } from './types';
import { canonicalSkill } from './skills.ts';
import { ROLE_SIGNALS, coverageOf, DIRECT_WEIGHT, TOPIC_WEIGHT } from './semantic.ts';

// Phase 3: real job postings ingested from free public job-board APIs
// (Remotive and Arbeitnow). Jobs are stored with their original application
// URLs; matching is a deterministic formula over the canonical skill
// dictionary — no LLM, no invented postings.

export type StoredJob = {
  id: string; source: string; title: string; company: string; url: string;
  location: string; tags: string[]; description: string; posted_at: string;
};
export type JobRequirement = { skill: string; where: 'title' | 'tags' | 'description' };
export type JobMatch = {
  id: string; source: string; title: string; company: string; url: string;
  location: string; posted_at: string; requirements: string[];
  matched: string[]; related?: string[]; gaps: string[]; match_pct: number; fresher_friendly: boolean;
};
export type SkillInput = Pick<NormalizedSkill, 'name' | 'topicOnly'>;
export type Filters = { minMatch?: number; city?: string; fresher?: boolean };

const MAX_AGE_DAYS = 30;
let db: DatabaseSync | undefined;
function database() {
  if (!db) {
    const dir = process.env.SKILLORA_DATA_DIR ?? join(process.cwd(), 'data');
    mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(join(dir, 'skillora.sqlite'));
    db.exec(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL,
      url TEXT NOT NULL, location TEXT NOT NULL, tags TEXT NOT NULL, description TEXT NOT NULL,
      posted_at TEXT NOT NULL, ingested_at TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS jobs_url ON jobs(url);
      CREATE INDEX IF NOT EXISTS jobs_posted ON jobs(posted_at);`);
  }
  db.prepare('DELETE FROM jobs WHERE posted_at < ?').run(new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString());
  return db;
}

export function saveJobs(jobs: StoredJob[]): { saved: number; skipped: number } {
  let saved = 0, skipped = 0;
  const insert = database().prepare('INSERT OR IGNORE INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const job of jobs) {
    const result = insert.run(job.id, job.source, job.title, job.company, job.url, job.location,
      JSON.stringify(job.tags), job.description, job.posted_at, new Date().toISOString());
    if (result.changes > 0) saved += 1; else skipped += 1;
  }
  return { saved, skipped };
}

export function jobCount(): number {
  return (database().prepare('SELECT COUNT(*) AS n FROM jobs').get() as { n: number }).n;
}

export function clearJobs() {
  database().exec('DELETE FROM jobs');
}

// City aliases used by Indian job seekers.
const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ['bengaluru'], bengaluru: ['bangalore'], gurgaon: ['gurugram'], gurugram: ['gurgaon'],
};
export function cityMatches(location: string, city: string): boolean {
  const haystack = location.toLowerCase();
  const needle = city.trim().toLowerCase();
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  return (CITY_ALIASES[needle] ?? []).some(alias => haystack.includes(alias));
}

const FRESHER_WORDS = /\b(junior|entry[- ]?level|fresher|graduate|intern(ship)?|trainee|traineeship|associate)\b/i;
const YEARS = /\b([1-9][0-9]*)\s*\+?\s*(?:to\s*[1-9][0-9]*\s*)?(?:years?|yrs?)\b/gi;
export function fresherFriendly(title: string, description: string): boolean {
  if (FRESHER_WORDS.test(title)) return true;
  let minimum = Infinity;
  for (const match of description.matchAll(YEARS)) {
    const years = Number(match[1]);
    if (match[0].trim().startsWith('0') || years < minimum) minimum = years;
  }
  return minimum === Infinity || minimum <= 2;
}

export function jobRequirements(job: StoredJob): JobRequirement[] {
  const found = new Map<string, JobRequirement>();
  const add = (raw: string, where: JobRequirement['where']) => {
    const skill = canonicalSkill(raw);
    if (skill && !found.has(skill.name)) found.set(skill.name, { skill: skill.name, where });
  };
  for (const tag of job.tags) add(tag, 'tags');
  // Role signals first: a title like "Frontend Developer" carries skill
  // context even when no technology is named (semantic job search).
  const titleWithRole = `${job.title} ${job.tags.join(' ')}`;
  for (const signal of ROLE_SIGNALS) {
    if (signal.pattern.test(titleWithRole)) for (const skill of signal.skills) {
      if (!found.has(skill)) found.set(skill, { skill, where: 'title' });
    }
  }
  const titleTokens = tokens(job.title);
  for (let i = 0; i < titleTokens.length; i += 1) {
    add(titleTokens[i], 'title');
    if (i + 1 < titleTokens.length) add(`${titleTokens[i]} ${titleTokens[i + 1]}`, 'title');
  }
  const bodyTokens = tokens(job.description);
  for (let i = 0; i < bodyTokens.length; i += 1) {
    add(bodyTokens[i], 'description');
    if (i + 1 < bodyTokens.length) add(`${bodyTokens[i]} ${bodyTokens[i + 1]}`, 'description');
  }
  return [...found.values()];
}

function tokens(text: string): string[] {
  return text
    .replace(/<[^>]*>/g, ' ')
    .split(/[^a-zA-Z0-9+#.]+/)
    .filter(token => token.length >= 2 && token.length <= 30);
}

// Deterministic, evidence-weighted ranking.
// - Requirements the user covers with byte-backed language evidence weigh 1;
//   topic-only evidence weighs 0.75 (proficiency signal).
// - A requirement covered only through a related technology (e.g. React
//   implied by JavaScript+HTML evidence) counts at the relation strength,
//   so related roles surface without inflating the match to 100%.
// - Skills required by the job title get a ranking bonus over description-only
//   skills. match_pct = weighted covered share of the job's requirements.
const TITLE_BONUS = 0.2;
export function matchJob(job: StoredJob, skills: SkillInput[]): JobMatch | null {
  const requirements = jobRequirements(job);
  if (requirements.length === 0) return null;
  const known = skills.map(skill => skill.name);
  const evidence = new Map(skills.map(skill => [skill.name, skill.topicOnly]));
  const matched: string[] = [], related: string[] = [], gaps: string[] = [];
  let weight = 0, titleWeight = 0;
  for (const requirement of requirements) {
    const direct = evidence.get(requirement.skill);
    if (direct !== undefined) {
      matched.push(requirement.skill);
      const covered = direct ? TOPIC_WEIGHT : DIRECT_WEIGHT;
      weight += covered;
      if (requirement.where === 'title') titleWeight += covered;
      continue;
    }
    const inferred = coverageOf(requirement.skill, known);
    if (inferred.weight > 0) {
      related.push(requirement.skill);
      weight += inferred.weight;
    } else {
      gaps.push(requirement.skill);
    }
  }
  const totalWeight = requirements.length;
  const base = (100 * weight) / totalWeight;
  const titleShare = requirements.filter(r => r.where === 'title').length;
  const bonus = titleWeight > 0 && titleShare > 0 ? TITLE_BONUS * (100 * titleWeight / titleShare) : 0;
  return {
    id: job.id, source: job.source, title: job.title, company: job.company, url: job.url,
    location: job.location, posted_at: job.posted_at, requirements: requirements.map(r => r.skill),
    matched, gaps, related: related.length > 0 ? related : undefined,
    match_pct: Math.min(100, Math.round(base + bonus)),
    fresher_friendly: fresherFriendly(job.title, job.description),
  };
}

export function allJobs(): StoredJob[] {
  const rows = database().prepare('SELECT id, source, title, company, url, location, tags, description, posted_at FROM jobs ORDER BY posted_at DESC').all() as (Omit<StoredJob, 'tags'> & { tags: string })[];
  return rows.map(row => ({ ...row, tags: JSON.parse(row.tags) as string[] }));
}

export function rankJobs(skills: SkillInput[], filters: Filters): { total: number; unfiltered: number; results: JobMatch[] } {
  const jobs = allJobs();
  const unfilteredMatches = jobs.map(job => matchJob(job, skills)).filter((m): m is JobMatch => m !== null);
  const minMatch = Math.max(0, Math.min(100, filters.minMatch ?? 0));
  const results = unfilteredMatches
    .filter(match => match.match_pct >= minMatch)
    .filter(match => !filters.city || cityMatches(match.location, filters.city))
    .filter(match => !filters.fresher || match.fresher_friendly)
    .sort((a, b) => b.match_pct - a.match_pct || Date.parse(b.posted_at) - Date.parse(a.posted_at) || a.title.localeCompare(b.title))
    .slice(0, 50);
  return { total: jobs.length, unfiltered: unfilteredMatches.length, results };
}
