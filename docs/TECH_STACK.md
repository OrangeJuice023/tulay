# Tech Stack

Each choice is marked **Decided** (in the repo and agreed), **Recommended** (proposed here, not
yet built), or **Unresolved**.

## Summary

| Layer | Choice | Status |
| --- | --- | --- |
| Web app | Next.js 16.4.3 App Router, React 19.3, TypeScript strict | Decided (in `apps/web/package.json`) |
| Styling | Tailwind CSS 4 | Decided (in repo) |
| Validation | Zod 3 | Decided (in `packages/shared`) |
| Auth + database | Supabase Auth + PostgreSQL with RLS | Recommended (no client or migrations yet) |
| AI | Meta provider in `services/ai` (Chat Completions + `json_schema`) | Implemented 2026-10-29, mock-verified; wire details Reported, live request open |
| Matching | SQL queries + deterministic TypeScript scoring | Recommended |
| Hosting | Vercel for web, Supabase hosted | Recommended |
| Package manager | npm | Decided (no lockfile committed yet) |
| Tests | Vitest for logic, Playwright for the demo flow | Recommended |
| Mobile | Expo / React Native | Not in MVP |
| MCP | None | Not in MVP |

## Reasoning

**Next.js + TypeScript.** Already scaffolded. Server actions and route handlers keep the Meta and
Supabase service-role keys on the server without a separate backend. One runtime for the hackathon.

**Supabase.** Gives auth, Postgres and row-level security in one hosted service, which is exactly
what consent and "see only your own rows" need. Relational data (people, offers, introductions,
collaborations) fits SQL better than a document store. Trade-off: RLS policies must be written and
tested carefully, because the anon key is public.

**Meta Model API, narrowly used.** The model does language work: turn a free-text goal into a
structured need, explain why a real candidate fits, draft an introduction the user edits.
It does not pick candidates, score them as truth, or change consent state. This keeps the demo
honest and works even when the model is unavailable (demo provider). Endpoint, model name and
structured-output shape are corroborated from public sources (provenance in
`docs/AI_AGENT_DESIGN.md`); primary-docs confirmation, rate limits and a live request are
still open.

**Deterministic matching.** For a community of tens to hundreds of members, filtering by
tag overlap between one person's needs and another's offers (plus language and availability) in
SQL is fast, explainable and testable. A vector database adds cost and opacity with no MVP payoff.
Revisit only if free-text offers make tag matching visibly fail.

**Monorepo layout with npm workspaces.** The root `package.json` links `apps/*`, `packages/*`
and `services/*`, and the web app imports `@tulay/shared` and `@tulay/ai` directly (via
`transpilePackages`). Wired 2026-10-28 (Muse Code).

**Not adding:** Redis, vector DB, queues, microservices, a separate MCP server, a second app
runtime. Each needs an ADR with a concrete requirement.

## Expo / mobile

Not in the MVP. A responsive web app demos on a phone browser. A separate app doubles UI work in
a 10-day hackathon. Revisit only with an ADR that names a feature that needs native capabilities.

## MCP

Not in the MVP. A plausible later use: expose Tulay's read-only "find someone who offers X" as an
MCP tool for other assistants. No demo needs this now.

## Unresolved

- Exact Meta Model API endpoint, auth scheme, model id, JSON/structured output support, limits.
- Whether the hackathon requires a specific Meta model or hosting.
- Supabase project (who creates it, which region).
- License.
