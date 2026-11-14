import neo4j, { type Driver } from 'neo4j-driver';
import type { Profile } from './types';
import { canonicalSkill } from './skills';

// Privacy: the graph stores only public repository facts (name, url, stars,
// pushedAt) and canonical skill evidence edges. No username or session ever
// reaches Neo4j, so no personal data is persisted.

let driver: Driver | undefined;
export function graphConfigured() {
  return Boolean(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);
}
async function getDriver() {
  if (!graphConfigured()) throw new Error('graph_unconfigured');
  if (!driver) {
    driver = neo4j.driver(process.env.NEO4J_URI!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!));
    await driver.verifyConnectivity();
  }
  return driver;
}
export async function closeGraph() {
  if (driver) { await driver.close(); driver = undefined; }
}
export async function initGraph() {
  const session = (await getDriver()).session();
  try {
    await session.run('CREATE CONSTRAINT repo_url IF NOT EXISTS FOR (r:Repo) REQUIRE r.url IS UNIQUE');
    await session.run('CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE');
    await session.run('CREATE CONSTRAINT job_url IF NOT EXISTS FOR (j:Job) REQUIRE j.url IS UNIQUE');
  } finally { await session.close(); }
}
export async function ingestProfile(profile: Profile) {
  const session = (await getDriver()).session();
  try {
    for (const repo of profile.repos) {
      await session.executeWrite(async tx => {
        await tx.run('MERGE (r:Repo {url: $url}) SET r.name = $name, r.stars = $stars, r.pushed_at = $pushed_at', {
          url: repo.url, name: repo.name, stars: repo.stars, pushed_at: repo.pushedAt,
        });
        await tx.run('MATCH (r:Repo {url: $url})-[e:EVIDENCES]->() DELETE e', { url: repo.url });
        for (const lang of repo.languages) {
          const skill = canonicalSkill(lang.name);
          if (!skill) continue;
          await tx.run('MERGE (s:Skill {name: $skill}) MERGE (r:Repo {url: $url}) MERGE (r)-[e:EVIDENCES {source: "language"}]->(s) SET e.bytes = $bytes', {
            url: repo.url, skill: skill.name, bytes: lang.bytes,
          });
        }
        for (const topic of repo.topics) {
          const skill = canonicalSkill(topic);
          if (!skill) continue;
          await tx.run('MERGE (s:Skill {name: $skill}) MERGE (r:Repo {url: $url}) MERGE (r)-[e:EVIDENCES {source: "topic"}]->(s)', {
            url: repo.url, skill: skill.name,
          });
        }
      });
    }
  } finally { await session.close(); }
}
// Job requirement edges: titleMatch marks skills found in the job title
// (weight 1.0 in the documented ranking) vs description-only (0.6).
export async function ingestJob(job: { url: string; title: string; company: string; location: string; postedAt: string; skills: string[]; titleSkills: Set<string> }) {
  const session = (await getDriver()).session();
  try {
    await session.executeWrite(async tx => {
      await tx.run('MERGE (j:Job {url: $url}) SET j.title = $title, j.company = $company, j.location = $location, j.posted_at = $posted_at', {
        url: job.url, title: job.title, company: job.company, location: job.location, posted_at: job.postedAt,
      });
      await tx.run('MATCH (j:Job {url: $url})-[e:REQUIRES]->() DELETE e', { url: job.url });
      for (const skill of job.skills) {
        await tx.run('MERGE (s:Skill {name: $skill}) MERGE (j:Job {url: $url}) MERGE (j)-[e:REQUIRES]->(s) SET e.title_match = $titleMatch', {
          url: job.url, skill, titleMatch: job.titleSkills.has(skill),
        });
      }
    });
  } finally { await session.close(); }
}

export async function jobSkillDemand(limit = 25) {
  const session = (await getDriver()).session();
  try {
    const result = await session.run(
      'MATCH (:Job)-[e:REQUIRES]->(s:Skill) RETURN s.name AS skill, count(e) AS jobs, sum(toInteger(e.title_match)) AS titleMentions ORDER BY jobs DESC, skill LIMIT $limit',
      { limit },
    );
    return result.records.map(record => ({
      skill: record.get('skill') as string,
      jobs: (record.get('jobs') as unknown as { toNumber: () => number }).toNumber(),
      titleMentions: (record.get('titleMentions') as unknown as { toNumber: () => number }).toNumber(),
    }));
  } finally { await session.close(); }
}

export async function skillEvidence(skillName: string) {
  const session = (await getDriver()).session();
  try {
    const result = await session.run(
      'MATCH (r:Repo)-[e:EVIDENCES]->(s:Skill {name: $skill}) RETURN r.name AS repo, r.url AS url, e.source AS source, e.bytes AS bytes ORDER BY e.bytes DESC LIMIT 50',
      { skill: skillName },
    );
    return result.records.map(record => ({
      repo: record.get('repo') as string,
      url: record.get('url') as string,
      source: record.get('source') as string,
      bytes: record.get('bytes') as number | null,
    }));
  } finally { await session.close(); }
}
