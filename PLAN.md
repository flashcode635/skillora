# Skillora build plan

## Goal and users
Build a bilingual, phone-first Next.js workspace that helps developers and freshers understand skills evidenced by public GitHub repositories and, in later phases, discover Indian jobs.
Working Phase 1 means a real public GitHub scan, language evidence with repository links, clear error/empty states, and a durable anonymous scan receipt created and listed through an API.

## Scope
In scope now: English/Hindi discovery screen, public username validation, GraphQL repository collection, deterministic language evidence (>5% of repository language bytes), repository stars/topics/activity, loading/retry states, and anonymous scan receipts.
Out of scope now: LLM extraction, persistent personal profiles, Neo4j graph, job ingestion/matching, authentication, private repositories, resumes, applications, and PDF guides. No fabricated jobs, skill profiles, or model responses.

## Architecture
- Next.js 16 App Router and TypeScript: server-rendered shell, small interactive discovery client, same-origin route handlers.
- CSS tokens and Lucide icons: selected Guided Skill Discovery design without a component framework.
- GitHub GraphQL: server-side GITHUB_TOKEN, public owned repositories only; exclude forks and archived repositories.
- POST /api/scans: validates username, collects up to 50 repositories and 10 languages/topics per repository, computes language evidence and records an anonymous receipt. No LLM calls.
- GET /api/scans: lists only receipts belonging to an opaque HttpOnly browser session.
- DELETE /api/scans: deletes this session's anonymous receipts.
- SQLite via Node's built-in node:sqlite: durable local table scan_receipts(id, session_hash, repository_count, skill_count, created_at). Never stores usernames, repository text, or profile data. Receipts expire after one hour, purged on access. This is scan bookkeeping, not a substitute for the specified Neo4j graph.
- Profile responses: no-store, client-memory only; discarded on page reload. Language preference only is stored in localStorage.
- Anonymous session cookie: HttpOnly, SameSite=Lax, Secure on HTTPS. Mutating requests require same origin. Server owns validation and evidence rules; client owns presentation and language selection.
- Preview: Node runtime with durable local filesystem. Production requires persistent volume for SQLite or a production receipt store; Vercel ephemeral filesystems are not supported for receipt persistence.
- Phase 2 requires OPENAI_API_KEY and NEO4J_URI/NEO4J_USER/NEO4J_PASSWORD in Vault. No alternate model/provider or graph database is silently substituted.

## Design brief
Audience: freshers and experienced developers on phone browsers.
Screen jobs: discovery enters a username; profile explains repository-backed language evidence; activity lists anonymous scan receipts.
Mood: calm, credible, encouraging.
Direction: Guided Skill Discovery; green, charcoal and soft-white tokens; a persistent desktop side rail and compact mobile navigation.
Memorable detail: a repository-to-skill evidence diagram within a softly gridded hero panel.
Typography: system sans display and body to avoid font-download latency; six-step scale.

## Risks and assumptions
- To avoid interpreting the unresolved privacy policy as permission, no public profile fields or username are stored. Only anonymous counts/receipts persist for one hour and can be deleted. Full-profile retention remains a Phase 2 decision.
- First 50 recently pushed owned repositories is the stated example bound, visibly disclosed. No claim to full-profile coverage or owner commit authorship.
- Phase 1 shows only deterministic language evidence, not the complete approximately 60-skill extraction pipeline. Topics/activity are contextual signals, not invented skills.
- Cold scans directly call GitHub only; no prohibited live LLM requests. GitHub errors and unavailable server credentials are visible, not replaced with fixtures.
- Ranking conflict, authorized job sources/budget, refresh and expiration policy, fresher eligibility, canonical dictionary, and background extraction scheduling remain explicit Phase 2/3 decisions.
- Only GITHUB_TOKEN is currently available. Missing AI/Neo4j credentials block those integrations, not the real GitHub slice.
- Supplied PNG contents cannot be visually verified by this agent. Do not treat the second image as a confirmed layout reference; use a text wordmark and functional graph motif, without claiming generated branding.

## Phase 1: Public evidence discovery
Deliver a real bilingual discovery-to-evidence flow with anonymous durable receipts.
- [x] Implement selected responsive design, language preference, help/privacy views and accessible states.
- [x] Implement validated public GitHub GraphQL collection and deterministic language proof.
- [x] Create SQLite receipt table and same-session create/list/delete API; expose receipts in the UI.
- [x] Verify build, API persistence and live scan, desktop/mobile flows, and accessibility.
Acceptance: a visitor analyzes a real username, sees public repository evidence, reloads and sees an anonymous scan receipt returned from SQLite, and can delete their receipt history.

## Phase 2: Normalized skills and knowledge graph
Implement canonical vocabulary, cached extraction and the Neo4j knowledge graph.
- [x] Add validated cached extraction by repository revision.
- [x] Add Neo4j constraints, idempotent ingestion, stale-edge removal and evidence queries.
- [x] Keep match percentages and ranking arithmetic deterministic.
- [x] Expose repository proof through GET /api/graph.
Acceptance: a real scan returns normalized skills with verifiable repository proof from Neo4j, without double-counting confidence.
Note: embeddings from the earlier interpretation are intentionally not implemented; the documented pipeline has no vector step.

## Phase 3: Indian job discovery
Connect legally usable current job postings and deterministic matching.
- [x] Ingest actual Indian jobs offline (Remotive, Arbeitnow, Jobicy, Google Jobs India and LinkedIn via SerpAPI), preserving application links.
- [x] Build ranked jobs, city/minimum-match/fresher filters, explanations, gaps and external applications in both languages.
- [x] Semantic skill-relationship layer: related technologies and role signals widen recall; weighted match_pct with title bonus.
- [x] Mirror jobs into Neo4j as (:Job)-[:REQUIRES {title_match}]->(:Skill).
Acceptance: a visitor finds actual matched jobs, distinguishes filtered-empty from no matches, understands the evidence and opens an original posting.
