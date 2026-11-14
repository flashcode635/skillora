import type { SkillCategory, NormalizedSkill } from './types';
export type { SkillCategory, NormalizedSkill } from './types';
export type CanonicalSkill = { name: string; aliases: string[]; category: SkillCategory };

const DICTIONARY: CanonicalSkill[] = [
  { name: 'JavaScript', aliases: ['js'], category: 'language' },
  { name: 'TypeScript', aliases: ['ts'], category: 'language' },
  { name: 'Python', aliases: ['python3'], category: 'language' },
  { name: 'Java', aliases: [], category: 'language' },
  { name: 'C', aliases: [], category: 'language' },
  { name: 'C++', aliases: ['cpp'], category: 'language' },
  { name: 'C#', aliases: ['csharp'], category: 'language' },
  { name: 'Go', aliases: ['golang'], category: 'language' },
  { name: 'Rust', aliases: [], category: 'language' },
  { name: 'Kotlin', aliases: [], category: 'language' },
  { name: 'Swift', aliases: [], category: 'language' },
  { name: 'PHP', aliases: [], category: 'language' },
  { name: 'Ruby', aliases: [], category: 'language' },
  { name: 'Shell', aliases: ['bash', 'shellscript', 'powershell'], category: 'language' },
  { name: 'HTML', aliases: [], category: 'language' },
  { name: 'CSS', aliases: ['scss', 'sass'], category: 'language' },
  { name: 'SQL', aliases: ['plsql', 'tsql'], category: 'language' },
  { name: 'Dart', aliases: [], category: 'language' },
  { name: 'React', aliases: ['reactjs', 'react.js'], category: 'framework' },
  { name: 'Next.js', aliases: ['nextjs'], category: 'framework' },
  { name: 'Vue', aliases: ['vuejs', 'vue.js', 'vue3'], category: 'framework' },
  { name: 'Angular', aliases: ['angularjs'], category: 'framework' },
  { name: 'Node.js', aliases: ['nodejs', 'node'], category: 'framework' },
  { name: 'Express', aliases: ['expressjs'], category: 'framework' },
  { name: 'Django', aliases: [], category: 'framework' },
  { name: 'Flask', aliases: [], category: 'framework' },
  { name: 'FastAPI', aliases: [], category: 'framework' },
  { name: 'Spring Boot', aliases: ['spring', 'springboot'], category: 'framework' },
  { name: 'Laravel', aliases: [], category: 'framework' },
  { name: 'Flutter', aliases: [], category: 'framework' },
  { name: 'React Native', aliases: ['reactnative'], category: 'framework' },
  { name: 'TensorFlow', aliases: ['tf'], category: 'library' },
  { name: 'PyTorch', aliases: ['torch'], category: 'library' },
  { name: 'Pandas', aliases: [], category: 'library' },
  { name: 'NumPy', aliases: ['numpy1'], category: 'library' },
  { name: 'PostgreSQL', aliases: ['postgres', 'psql'], category: 'database' },
  { name: 'MySQL', aliases: ['mariadb'], category: 'database' },
  { name: 'MongoDB', aliases: ['mongo'], category: 'database' },
  { name: 'Redis', aliases: [], category: 'database' },
  { name: 'SQLite', aliases: ['sqlite3'], category: 'database' },
  { name: 'Docker', aliases: ['dockerfile', 'containerization'], category: 'tool' },
  { name: 'Kubernetes', aliases: ['k8s', 'kubectl', 'helm'], category: 'tool' },
  { name: 'Git', aliases: ['github', 'gitlab', 'version-control'], category: 'tool' },
  { name: 'Linux', aliases: ['unix', 'ubuntu', 'debian'], category: 'tool' },
  { name: 'Terraform', aliases: ['infrastructure-as-code', 'iac'], category: 'tool' },
  { name: 'AWS', aliases: ['amazon-web-services', 'ec2', 's3', 'lambda'], category: 'platform' },
  { name: 'Azure', aliases: ['microsoft-azure'], category: 'platform' },
  { name: 'Google Cloud', aliases: ['gcp', 'google-cloud'], category: 'platform' },
  { name: 'Machine Learning', aliases: ['ml', 'deep-learning', 'neural-networks'], category: 'practice' },
  { name: 'Data Science', aliases: ['data-analysis', 'data-visualization'], category: 'practice' },
  { name: 'REST API', aliases: ['rest', 'rest-api', 'api-development'], category: 'practice' },
  { name: 'GraphQL', aliases: ['apollo'], category: 'practice' },
  { name: 'Android', aliases: ['android-sdk', 'android-app'], category: 'practice' },
  { name: 'iOS', aliases: ['ios-app'], category: 'practice' },
];

const aliasIndex = new Map<string, CanonicalSkill>();
for (const skill of DICTIONARY) {
  for (const alias of [skill.name, ...skill.aliases]) aliasIndex.set(normalizeKey(alias), skill);
}
function normalizeKey(raw: string) {
  return raw.toLowerCase().replace(/[\s_.-]/g, '');
}
export function canonicalSkill(raw: string): CanonicalSkill | null {
  return aliasIndex.get(normalizeKey(raw)) ?? null;
}
export function normalizeEvidence(repos: { name: string; topics: string[]; languages: { name: string; bytes: number }[] }[]): NormalizedSkill[] {
  const map = new Map<string, NormalizedSkill>();
  const entryFor = (skill: CanonicalSkill) => {
    let entry = map.get(skill.name);
    if (!entry) { entry = { name: skill.name, category: skill.category, repos: [], bytes: 0, topicOnly: true }; map.set(skill.name, entry); }
    return entry;
  };
  for (const repo of repos) {
    for (const lang of repo.languages) {
      const skill = canonicalSkill(lang.name);
      if (skill) { const entry = entryFor(skill); entry.bytes += lang.bytes; entry.repos.push(repo.name); entry.topicOnly = false; }
    }
    for (const topic of repo.topics) {
      const skill = canonicalSkill(topic);
      if (skill && !entryFor(skill).repos.includes(repo.name)) entryFor(skill).repos.push(repo.name);
    }
  }
  return [...map.values()].sort((a, b) => b.repos.length - a.repos.length || b.bytes - a.bytes || a.name.localeCompare(b.name));
}
