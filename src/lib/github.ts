import type { Profile, Repo } from './types';
export class ScanError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

type GitRepo = { name: string; url: string; isPrivate: boolean; isFork: boolean; isArchived: boolean; stargazerCount: number; pushedAt: string | null; repositoryTopics: { nodes: { topic: { name: string } }[] }; languages: { totalSize: number; edges: { size: number; node: { name: string } }[] } };
const QUERY = `query Scan($username: String!) { user(login: $username) { login repositories(first: 50, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: PUSHED_AT, direction: DESC}) { pageInfo { hasNextPage } nodes { name url isPrivate isFork isArchived stargazerCount pushedAt repositoryTopics(first: 10) { nodes { topic { name } } } languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { totalSize edges { size node { name } } } } } } }`;
let tokenInvalid = false;

type RestRepo = { name: string; html_url: string; stargazers_count: number; pushed_at: string | null; fork: boolean; archived: boolean; topics?: string[] };
type RestLangs = Record<string, number>;

async function githubFetch(path: string, token?: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store', signal: AbortSignal.timeout(25000),
  });
}

async function analyzeRest(username: string): Promise<Profile> {
  const userResponse = await githubFetch(`/users/${encodeURIComponent(username)}`);
  if (userResponse.status === 404) throw new ScanError('not_found', 404);
  if (userResponse.status === 403 || userResponse.status === 429) throw new ScanError('rate_limit', 429);
  if (!userResponse.ok) throw new ScanError('unavailable', 502);
  const user = await userResponse.json() as { login: string };

  const reposResponse = await githubFetch(`/users/${encodeURIComponent(username)}/repos?per_page=50&sort=pushed&direction=desc&type=owner`);
  if (reposResponse.status === 403 || reposResponse.status === 429) throw new ScanError('rate_limit', 429);
  if (!reposResponse.ok) throw new ScanError('unavailable', 502);
  const raw = await reposResponse.json() as RestRepo[];
  const candidates = raw.filter(r => !r.fork && !r.archived);
  const limited = raw.length === 50;

  const repos: Repo[] = await Promise.all(candidates.map(async repo => {
    const languagesResponse = await githubFetch(`/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/languages`);
    const byName: RestLangs = languagesResponse.ok ? await languagesResponse.json() : {};
    const total = Object.values(byName).reduce((sum, bytes) => sum + bytes, 0);
    return {
      name: repo.name, url: repo.html_url, stars: repo.stargazers_count, pushedAt: repo.pushed_at,
      topics: (repo.topics ?? []).slice(0, 10),
      languages: Object.entries(byName)
        .sort(([, a], [, b]) => b - a)
        .filter(([, bytes]) => total > 0 && bytes / total > 0.05)
        .map(([name, bytes]) => ({ name, bytes })),
    };
  }));
  return buildProfile(user.login, repos, limited);
}

function buildProfile(login: string, repos: Repo[], limited: boolean): Profile {
  const map = new Map<string, { name: string; repos: string[]; bytes: number }>();
  for (const repo of repos) for (const lang of repo.languages) {
    const skill = map.get(lang.name) ?? { name: lang.name, repos: [], bytes: 0 };
    skill.repos.push(repo.name); skill.bytes += lang.bytes; map.set(lang.name, skill);
  }
  return { username: login, repos, skills: [...map.values()].sort((a, b) => b.repos.length - a.repos.length || b.bytes - a.bytes), normalized: [], scannedAt: new Date().toISOString(), limited };
}

export async function analyze(username: string): Promise<Profile> {
  const token = process.env.GITHUB_TOKEN;
  if (token && !tokenInvalid) {
    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { username } }),
        cache: 'no-store', signal: AbortSignal.timeout(25000),
      });
      if (response.status === 401) { tokenInvalid = true; } // fall through to anonymous REST
      else {
        if (response.status === 429 || response.status === 403) throw new ScanError('rate_limit', 429);
        if (!response.ok) throw new ScanError('unavailable', 502);
        const data = await response.json();
        if (data.errors?.some((e: { type?: string }) => e.type === 'RATE_LIMITED')) throw new ScanError('rate_limit', 429);
        if (data.errors?.some((e: { type?: string }) => e.type === 'NOT_FOUND')) throw new ScanError('not_found', 404);
        if (data.errors) throw new ScanError('unavailable', 502);
        if (!data.data?.user) throw new ScanError('not_found', 404);
        const user = data.data.user;
        const repos: Repo[] = (user.repositories.nodes as GitRepo[]).filter(r => !r.isPrivate && !r.isFork && !r.isArchived).map(r => ({
          name: r.name, url: r.url, stars: r.stargazerCount, pushedAt: r.pushedAt, topics: r.repositoryTopics.nodes.map(t => t.topic.name),
          languages: r.languages.edges.filter(l => r.languages.totalSize > 0 && l.size / r.languages.totalSize > 0.05).map(l => ({ name: l.node.name, bytes: l.size })),
        }));
        return buildProfile(user.login, repos, user.repositories.pageInfo.hasNextPage);
      }
    } catch (error) { if (error instanceof ScanError) throw error; throw new ScanError('timeout', 504); }
  }
  try { return await analyzeRest(username); }
  catch (error) { if (error instanceof ScanError) throw error; throw new ScanError('timeout', 504); }
}
