// Ingests real job postings from free public job-board APIs into data/skillora.sqlite.
// Sources: Remotive public API (https://remotive.com/api/remote-jobs — jobs must
// be shown with a Remotive attribution and link back), Arbeitnow's public
// job-board API (https://www.arbeitnow.com/api/job-board-api), Jobicy's
// public API (https://jobicy.com/api/v2/remote-jobs) and SerpAPI Google Jobs
// (https://serpapi.com/search?engine=google_jobs, India location, needs SERPAPI_KEY).
// Only postings open to candidates in India are kept; nothing is invented.
// Run: bun scripts/ingest-jobs.ts   (add --clear to wipe stored jobs first)
import { saveJobs, clearJobs, jobCount, allJobs, jobRequirements, type StoredJob } from '../src/lib/jobs';
import { graphConfigured, initGraph, ingestJob, closeGraph } from '../src/lib/graph';

const UA = { 'User-Agent': 'skillora-ingest', Accept: 'application/json' };
const INDIA = /india|worldwide|anywhere|global(ly)?|world wide/i;
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);

async function remotive(): Promise<StoredJob[]> {
  const response = await fetch('https://remotive.com/api/remote-jobs?limit=300', { headers: UA });
  if (!response.ok) throw new Error(`remotive ${response.status}`);
  const body = await response.json() as { jobs: { id: number; url: string; title: string; company_name: string; candidate_required_location: string; tags: string[]; description: string; publication_date: string }[] };
  return body.jobs
    .filter(job => INDIA.test(job.candidate_required_location))
    .map(job => ({
      id: `remotive:${job.id}`, source: 'remotive', title: job.title, company: job.company_name,
      url: job.url, location: job.candidate_required_location || 'Remote', tags: job.tags ?? [],
      description: stripHtml(job.description), posted_at: job.publication_date,
    }));
}

async function arbeitnow(): Promise<StoredJob[]> {
  const response = await fetch('https://www.arbeitnow.com/api/job-board-api', { headers: UA });
  if (!response.ok) throw new Error(`arbeitnow ${response.status}`);
  const body = await response.json() as { data: { slug: string; url: string; title: string; company_name: string; location: string; tags: string[]; description: string; created_at: number }[] };
  return body.data
    .filter(job => INDIA.test(job.location))
    .map(job => ({
      id: `arbeitnow:${job.slug}`, source: 'arbeitnow', title: job.title, company: job.company_name,
      url: job.url, location: job.location || 'India', tags: job.tags ?? [],
      description: stripHtml(job.description), posted_at: new Date(job.created_at * 1000).toISOString(),
    }));
}

async function jobicy(): Promise<StoredJob[]> {
  const jobs: StoredJob[] = [];
  for (const industry of ['dev', 'marketing']) {
    const response = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=100&industry=${industry}`, { headers: UA });
    if (!response.ok) throw new Error(`jobicy ${response.status}`);
    const body = await response.json() as { jobs: { id: number; url: string; jobTitle: string; companyName: string; jobGeo: string; jobLevel: string; jobDescription: string; pubDate: string }[] };
    for (const job of body.jobs ?? []) {
      if (!INDIA.test(job.jobGeo)) continue;
      jobs.push({
        id: `jobicy:${job.id}`, source: 'jobicy', title: job.jobTitle, company: job.companyName,
        url: job.url, location: job.jobGeo || 'Remote', tags: [job.jobLevel].filter(Boolean),
        description: stripHtml(job.jobDescription), posted_at: job.pubDate,
      });
    }
  }
  return jobs;
}

async function serpapi(): Promise<StoredJob[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error('SERPAPI_KEY not set');
  const jobs: StoredJob[] = [];
  for (const q of ['software developer', 'frontend developer', 'backend developer', 'react developer', 'python developer', 'node js developer']) {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', q);
    url.searchParams.set('location', 'India');
    url.searchParams.set('hl', 'en');
    url.searchParams.set('gl', 'in');
    url.searchParams.set('api_key', key);
    const response = await fetch(url, { headers: UA });
    if (!response.ok) throw new Error(`serpapi ${response.status}`);
    const body = await response.json() as { jobs_results?: { job_id?: string; title?: string; company_name?: string; location?: string; description?: string; posted_at?: string; apply_options?: { link?: string }[] }[] };
    for (const job of body.jobs_results ?? []) {
      const apply = job.apply_options?.find(option => option.link)?.link;
      if (!job.job_id || !apply) continue;
      jobs.push({
        id: `serpapi:${job.job_id}`, source: 'serpapi', title: job.title ?? 'Untitled',
        company: job.company_name ?? 'Unknown company', url: apply,
        location: job.location || 'India', tags: [],
        description: stripHtml(job.description ?? ''),
        posted_at: job.posted_at ? relativeDate(job.posted_at) : new Date().toISOString(),
      });
    }
  }
  return jobs;
}

// LinkedIn jobs and internships: Google Jobs results frequently point at
// linkedin.com/job pages, so query Google Jobs (India) with role and
// internship terms and label each posting by where its apply link actually
// goes (linkedin, linkedin-internship, or serpapi). Same id namespace as the
// serpapi() source so cross-run duplicates are still deduplicated.
async function linkedin(): Promise<StoredJob[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error('SERPAPI_KEY not set');
  const jobs: StoredJob[] = [];
  for (const q of ['software developer', 'frontend developer', 'python developer', 'software developer internship', 'react node internship', 'web development internship']) {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', q);
    url.searchParams.set('location', 'India');
    url.searchParams.set('hl', 'en');
    url.searchParams.set('gl', 'in');
    url.searchParams.set('api_key', key);
    const response = await fetch(url, { headers: UA });
    if (!response.ok) throw new Error(`serpapi linkedin ${response.status}`);
    const body = await response.json() as { jobs_results?: { job_id?: string; title?: string; company_name?: string; location?: string; description?: string; posted_at?: string; apply_options?: { link?: string }[] }[] };
    for (const job of body.jobs_results ?? []) {
      const apply = job.apply_options?.find(option => option.link)?.link;
      if (!job.job_id || !apply) continue;
      const title = job.title ?? 'Untitled';
      const host = new URL(apply).hostname;
      if (!/linkedin\.|intern/i.test(host + title)) continue;
      jobs.push({
        id: `serpapi:${job.job_id}`, source: /linkedin\./.test(host) ? 'linkedin' : 'linkedin-internship',
        title, company: job.company_name ?? 'Unknown company',
        url: apply, location: job.location || 'India', tags: /intern/i.test(title) ? ['internship'] : [],
        description: stripHtml(job.description ?? ''),
        posted_at: job.posted_at ? relativeDate(job.posted_at) : new Date().toISOString(),
      });
    }
  }
  return jobs;
}

// Google returns relative dates like "3 days ago"; convert conservatively.
function relativeDate(text: string): string {
  const match = /(\d+)\s+(hour|day|week|month)s?\s+ago/i.exec(text);
  if (!match) return new Date().toISOString();
  const unit = { hour: 3600000, day: 86400000, week: 7 * 86400000, month: 30 * 86400000 }[match[2].toLowerCase() as 'hour' | 'day' | 'week' | 'month'];
  return new Date(Date.now() - Number(match[1]) * unit).toISOString();
}

if (process.argv.includes('--clear')) clearJobs();
let saved = 0, skipped = 0;
for (const [name, fetchJobs] of [['remotive', remotive], ['arbeitnow', arbeitnow], ['jobicy', jobicy], ['serpapi', serpapi], ['linkedin', linkedin]] as const) {
  try {
    const result = saveJobs(await fetchJobs());
    saved += result.saved; skipped += result.skipped;
    console.log(`${name}: ${result.saved} saved, ${result.skipped} duplicates`);
  } catch (error) {
    console.error(`${name} failed:`, error instanceof Error ? error.message : error);
  }
}
console.log(`done: ${saved} new, ${skipped} duplicates, ${jobCount()} stored in total`);

// Mirror jobs into Neo4j as (:Job)-[:REQUIRES {title_match}]->(:Skill) so the
// graph can answer demand questions (which skills jobs ask for). Idempotent:
// edges are replaced per job on each run. Skips silently when NEO4J_* is unset.
if (graphConfigured()) {
  try {
    await initGraph();
    let graphed = 0;
    for (const job of allJobs()) {
      const requirements = jobRequirements(job);
      if (requirements.length === 0) continue;
      await ingestJob({
        url: job.url, title: job.title, company: job.company, location: job.location, postedAt: job.posted_at,
        skills: requirements.map(requirement => requirement.skill),
        titleSkills: new Set(requirements.filter(requirement => requirement.where === 'title').map(requirement => requirement.skill)),
      });
      graphed++;
    }
    console.log(`graph: ${graphed} jobs synced to Neo4j`);
  } catch (error) {
    console.error('graph sync failed:', error instanceof Error ? error.message : error);
  } finally {
    await closeGraph();
  }
}
