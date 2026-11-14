// Semantic skill relationships: lets the matcher recognise related
// technologies, equivalent stacks and transferable frameworks, so a React
// developer also surfaces for "Frontend Developer" or "JavaScript Developer"
// postings even when the exact keyword never appears in their repositories.
// Deterministic and hand-curated — no embeddings, no LLM, no invented scores.

export type Relation = { skill: string; strength: number };

// strength: how strongly knowing the key skill implies the related skill
// (0.9 = near-equivalent evidence, 0.3 = weak transfer).
const FAMILIES: Record<string, Relation[]> = {
  // Frontend web
  JavaScript: [
    { skill: 'TypeScript', strength: 0.7 }, { skill: 'React', strength: 0.5 },
    { skill: 'Node.js', strength: 0.5 }, { skill: 'HTML', strength: 0.6 }, { skill: 'CSS', strength: 0.6 },
  ],
  TypeScript: [
    { skill: 'JavaScript', strength: 0.9 }, { skill: 'React', strength: 0.5 },
    { skill: 'Node.js', strength: 0.5 }, { skill: 'Next.js', strength: 0.5 },
  ],
  React: [
    { skill: 'JavaScript', strength: 0.9 }, { skill: 'TypeScript', strength: 0.6 },
    { skill: 'Next.js', strength: 0.6 }, { skill: 'React Native', strength: 0.5 },
    { skill: 'HTML', strength: 0.6 }, { skill: 'CSS', strength: 0.6 }, { skill: 'REST API', strength: 0.4 },
  ],
  'Next.js': [
    { skill: 'React', strength: 0.9 }, { skill: 'JavaScript', strength: 0.7 },
    { skill: 'TypeScript', strength: 0.6 }, { skill: 'REST API', strength: 0.4 },
  ],
  Vue: [{ skill: 'JavaScript', strength: 0.8 }, { skill: 'TypeScript', strength: 0.5 }, { skill: 'HTML', strength: 0.5 }, { skill: 'CSS', strength: 0.5 }],
  Angular: [{ skill: 'JavaScript', strength: 0.8 }, { skill: 'TypeScript', strength: 0.7 }, { skill: 'HTML', strength: 0.5 }, { skill: 'CSS', strength: 0.5 }],
  HTML: [{ skill: 'CSS', strength: 0.7 }, { skill: 'JavaScript', strength: 0.4 }],
  CSS: [{ skill: 'HTML', strength: 0.7 }, { skill: 'JavaScript', strength: 0.4 }],
  // Backend / runtime
  'Node.js': [
    { skill: 'JavaScript', strength: 0.9 }, { skill: 'TypeScript', strength: 0.6 },
    { skill: 'Express', strength: 0.7 }, { skill: 'REST API', strength: 0.6 },
    { skill: 'MongoDB', strength: 0.4 }, { skill: 'PostgreSQL', strength: 0.4 },
  ],
  Express: [{ skill: 'Node.js', strength: 0.9 }, { skill: 'REST API', strength: 0.7 }],
  Django: [{ skill: 'Python', strength: 0.9 }, { skill: 'REST API', strength: 0.5 }, { skill: 'PostgreSQL', strength: 0.4 }, { skill: 'MySQL', strength: 0.4 }],
  Flask: [{ skill: 'Python', strength: 0.9 }, { skill: 'REST API', strength: 0.5 }],
  FastAPI: [{ skill: 'Python', strength: 0.9 }, { skill: 'REST API', strength: 0.7 }],
  'Spring Boot': [{ skill: 'Java', strength: 0.9 }, { skill: 'REST API', strength: 0.6 }, { skill: 'MySQL', strength: 0.4 }, { skill: 'PostgreSQL', strength: 0.4 }],
  Laravel: [{ skill: 'PHP', strength: 0.9 }, { skill: 'MySQL', strength: 0.5 }, { skill: 'REST API', strength: 0.5 }],
  // Languages
  Python: [
    { skill: 'Django', strength: 0.4 }, { skill: 'Flask', strength: 0.4 }, { skill: 'FastAPI', strength: 0.4 },
    { skill: 'Pandas', strength: 0.4 }, { skill: 'Data Science', strength: 0.4 }, { skill: 'Machine Learning', strength: 0.35 },
  ],
  Java: [{ skill: 'Spring Boot', strength: 0.5 }, { skill: 'REST API', strength: 0.4 }],
  'C++': [{ skill: 'C', strength: 0.6 }],
  C: [{ skill: 'C++', strength: 0.5 }, { skill: 'Linux', strength: 0.4 }],
  'C#': [{ skill: 'SQL', strength: 0.4 }],
  Go: [{ skill: 'Docker', strength: 0.4 }, { skill: 'Kubernetes', strength: 0.35 }],
  Kotlin: [{ skill: 'Android', strength: 0.6 }, { skill: 'Java', strength: 0.5 }],
  Swift: [{ skill: 'iOS', strength: 0.6 }],
  PHP: [{ skill: 'MySQL', strength: 0.4 }, { skill: 'Laravel', strength: 0.3 }],
  Ruby: [{ skill: 'REST API', strength: 0.3 }],
  SQL: [{ skill: 'PostgreSQL', strength: 0.3 }, { skill: 'MySQL', strength: 0.3 }],
  // Mobile
  Android: [{ skill: 'Kotlin', strength: 0.5 }, { skill: 'Java', strength: 0.5 }],
  iOS: [{ skill: 'Swift', strength: 0.5 }],
  Flutter: [{ skill: 'Dart', strength: 0.9 }, { skill: 'Android', strength: 0.4 }, { skill: 'iOS', strength: 0.4 }],
  'React Native': [{ skill: 'React', strength: 0.8 }, { skill: 'JavaScript', strength: 0.6 }, { skill: 'Android', strength: 0.35 }, { skill: 'iOS', strength: 0.35 }],
  Dart: [{ skill: 'Flutter', strength: 0.7 }],
  // Data / ML
  'Machine Learning': [{ skill: 'Python', strength: 0.7 }, { skill: 'PyTorch', strength: 0.5 }, { skill: 'TensorFlow', strength: 0.5 }, { skill: 'Data Science', strength: 0.7 }],
  'Data Science': [{ skill: 'Python', strength: 0.7 }, { skill: 'Pandas', strength: 0.6 }, { skill: 'NumPy', strength: 0.5 }, { skill: 'SQL', strength: 0.4 }],
  TensorFlow: [{ skill: 'Machine Learning', strength: 0.7 }, { skill: 'Python', strength: 0.6 }],
  PyTorch: [{ skill: 'Machine Learning', strength: 0.7 }, { skill: 'Python', strength: 0.6 }],
  Pandas: [{ skill: 'Python', strength: 0.7 }, { skill: 'NumPy', strength: 0.5 }],
  NumPy: [{ skill: 'Python', strength: 0.7 }, { skill: 'Pandas', strength: 0.5 }],
  // Data stores
  PostgreSQL: [{ skill: 'SQL', strength: 0.8 }, { skill: 'MySQL', strength: 0.5 }],
  MySQL: [{ skill: 'SQL', strength: 0.8 }, { skill: 'PostgreSQL', strength: 0.5 }],
  MongoDB: [{ skill: 'Node.js', strength: 0.3 }, { skill: 'REST API', strength: 0.3 }],
  Redis: [{ skill: 'REST API', strength: 0.2 }],
  // Tools / cloud
  Docker: [{ skill: 'Kubernetes', strength: 0.5 }, { skill: 'Linux', strength: 0.4 }],
  Kubernetes: [{ skill: 'Docker', strength: 0.9 }, { skill: 'Linux', strength: 0.4 }],
  Linux: [{ skill: 'Shell', strength: 0.6 }, { skill: 'Docker', strength: 0.3 }],
  Git: [{ skill: 'Linux', strength: 0.2 }],
  AWS: [{ skill: 'Docker', strength: 0.4 }, { skill: 'Linux', strength: 0.4 }, { skill: 'REST API', strength: 0.3 }],
  Azure: [{ skill: 'Docker', strength: 0.35 }, { skill: 'C#', strength: 0.3 }],
  'Google Cloud': [{ skill: 'Docker', strength: 0.35 }, { skill: 'Linux', strength: 0.3 }],
  Terraform: [{ skill: 'AWS', strength: 0.4 }, { skill: 'Docker', strength: 0.4 }],
  'REST API': [{ skill: 'Node.js', strength: 0.3 }, { skill: 'Express', strength: 0.3 }, { skill: 'FastAPI', strength: 0.3 }],
  GraphQL: [{ skill: 'REST API', strength: 0.5 }, { skill: 'JavaScript', strength: 0.3 }],
};

// Best inferred strength for every (known -> related) pair.
const relationIndex = new Map<string, Map<string, number>>();
for (const [known, relations] of Object.entries(FAMILIES)) {
  const inner = relationIndex.get(known) ?? new Map<string, number>();
  for (const relation of relations) inner.set(relation.skill, Math.max(inner.get(relation.skill) ?? 0, relation.strength));
  relationIndex.set(known, inner);
}

// Role signals: job titles imply a skill context even without naming a
// technology ("Frontend Developer" implies the web triad). Used to infer
// requirements from roles so related postings surface for related profiles.
export const ROLE_SIGNALS: { pattern: RegExp; skills: string[] }[] = [
  { pattern: /front[- ]?end/i, skills: ['JavaScript', 'React', 'CSS', 'HTML'] },
  { pattern: /back[- ]?end/i, skills: ['REST API', 'Node.js', 'SQL', 'PostgreSQL'] },
  { pattern: /full[- ]?stack|mern|mean stack/i, skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'] },
  { pattern: /\bdevops\b|\bsre\b|site reliability/i, skills: ['Docker', 'Kubernetes', 'Linux', 'Terraform', 'AWS'] },
  { pattern: /data (scientist|analyst)|analytics/i, skills: ['Python', 'SQL', 'Pandas', 'Data Science'] },
  { pattern: /machine learning|\bml\b|\bai\b|artificial intelligence/i, skills: ['Python', 'Machine Learning', 'PyTorch'] },
  { pattern: /mobile|android|flutter|ios developer/i, skills: ['Android', 'Flutter', 'Kotlin'] },
  { pattern: /\bqa\b|test(ing|er)|sdet/i, skills: ['JavaScript', 'Python', 'SQL'] },
];

// How well the user's evidence covers `skill`: 1 for direct byte-backed
// evidence, 0.75 for topic-only, or the strongest relation chain from any
// known skill (discounted — related evidence is weaker than direct).
export const DIRECT_WEIGHT = 1;
export const TOPIC_WEIGHT = 0.75;
const RELATED_CAP = 0.6;

export type Coverage = { weight: number; via?: string };
export function coverageOf(skill: string, known: Iterable<string>): Coverage {
  let best: Coverage = { weight: 0 };
  for (const name of known) {
    if (name === skill) return { weight: DIRECT_WEIGHT };
  }
  for (const name of known) {
    const strength = relationIndex.get(name)?.get(skill);
    if (strength && strength > best.weight) best = { weight: Math.min(RELATED_CAP, strength), via: name };
  }
  return best;
}

// Skills the user demonstrably knows; used as the direct set.
export function relatedOf(skill: string): Relation[] {
  return FAMILIES[skill] ?? [];
}
