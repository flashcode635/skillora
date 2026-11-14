export type SkillCategory = 'language' | 'framework' | 'library' | 'database' | 'tool' | 'platform' | 'practice';
export type NormalizedSkill = { name: string; category: SkillCategory; repos: string[]; bytes: number; topicOnly: boolean };
export type Repo = { name: string; url: string; stars: number; pushedAt: string | null; topics: string[]; languages: { name: string; bytes: number }[] };
export type Profile = { username: string; repos: Repo[]; skills: { name: string; repos: string[]; bytes: number }[]; normalized: NormalizedSkill[]; scannedAt: string; limited: boolean };
export type Receipt = { id: string; repository_count: number; skill_count: number; created_at: string };
