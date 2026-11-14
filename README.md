# Skillora

Bilingual (EN/हिंदी), phone-first Next.js workspace that turns public GitHub repositories into an evidence-backed skill profile, then matches it to Indian job postings. No sign-up required.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
node --experimental-strip-types --test tests/*.test.ts
```

## Features

- **GitHub scan** — enter a public username; GraphQL collection of owned public repos (forks/archived excluded), deterministic language evidence (>5% bytes), topics and activity signals. Falls back to the anonymous REST API without a token.
- **Canonical skills** — ~60-skill dictionary with alias normalization (reactjs → React, k8s → Kubernetes), merging byte and topic evidence.
- **Neo4j graph** — `(:Repo)-[:EVIDENCES]->(:Skill)` per scan, `(:Job)-[:REQUIRES {title_match}]->(:Skill)` per job; evidence queries via `GET /api/graph?skill=`. Activated by `NEO4J_URI`/`NEO4J_USER`/`NEO4J_PASSWORD`.
- **Indian job search** — postings from Remotive, Arbeitnow, Jobicy, Google Jobs India and LinkedIn (via SerpAPI), ingested offline by `scripts/ingest-jobs.ts` into SQLite and mirrored to Neo4j.
- **Semantic matching** — hand-curated skill families (`src/lib/semantic.ts`) infer related evidence (React ⇒ Next.js/JavaScript) and role requirements ("Frontend Developer" ⇒ web triad); weighted deterministic `match_pct` with title bonus, city/fresher filters and plain-language gap lists.
- **Bilingual UI** — every screen in English and हिंदी, mobile-first, anonymous receipts, no login anywhere.

## Environment (all optional)

`GITHUB_TOKEN` (raises GitHub rate limits), `SERPAPI_KEY` (Google Jobs/LinkedIn ingestion), `NEO4J_URI`/`NEO4J_USER`/`NEO4J_PASSWORD` (graph). Secrets live in `.env.local` (gitignored) or the platform Vault.

## Privacy

No login, no OAuth, no personal data. Scans keep only an anonymous one-hour receipt keyed to an opaque session cookie; usernames and profile data stay in memory and are never persisted.
