# AGENTS.md

Canonical instructions for every coding agent on Tulay (Claude Code, Kilo, Muse Code, and humans).
Tool-specific files (`CLAUDE.md`, Kilo rules) may add to this file but never contradict or copy it.

## Project

Tulay is a community-powered AI agent for freelancers, career shifters and independent workers,
Philippines first. It helps people state a career goal, name the specific help they need, find
people with complementary skills and offers, get consent for an introduction, coordinate a concrete
collaboration, and record whether it helped.

**"Your next career move shouldn't be a solo mission."**

**North star** (canonical: `docs/PROJECT_DIRECTION.md`): AI should help people help one another,
not replace the human relationships that make career mobility possible.

Core flow: goal → specific need → complementary people → consent → collaboration → outcome.
Meta Global AI Developer Hackathon MVP (Oct 26 to Nov 4, 2026). One polished end-to-end flow beats
many half-built features.

## Product rules (non-negotiable)

1. **Consent first.** No message, introduction or contact detail reaches another person until both
   people have explicitly approved it. No automatic outreach.
2. **Real people only.** The model never invents members, skills, credentials, availability or
   outcomes. Candidates come from database queries; the model only explains or drafts about them.
3. **AI assists, code decides.** Candidate retrieval, matching constraints, authorization and
   consent state are deterministic application logic. Model output is untrusted input: validate
   it with the Zod schemas in `packages/shared` before use.
4. **Demo is labelled.** Seeded people have `is_demo = true` and show a visible "Demo" label.
   Missing credentials mean demo mode, which must say so in the UI.
5. **Privacy by design.** Row-level security on every user table; users see only their own rows
   and rows they are party to. Secrets stay server-side.
6. **Scope.** Not in the MVP: public feed, payments, job board, reputation scores, full chat,
   microservices, Redis, vector DB, a separate MCP server, a mobile app. Adding any of these
   needs a decision record in `docs/decisions/`.

## Product principles

From `docs/PROJECT_DIRECTION.md` (canonical). Apply to every product, demo, and copy decision:

1. **Relationships are the goal.** Human relationships are the end goal, not AI engagement.
   A match or a drafted message is never the outcome; a completed act of help is.
2. **Grounded recommendations.** Every AI recommendation must be grounded in actual application
   data. Never invent people, skills, credentials, availability, or outcomes.
3. **Reciprocity without pressure.** Show when two people can help each other, but never pressure
   a user to offer help.
4. **Consent before outreach.** Consent and user agency come before automated outreach. Nothing
   reaches another person without explicit approval.
5. **No unproven claims.** Do not claim Tulay eliminates loneliness, guarantees career success,
   or improves career outcomes without supporting evidence. Hypotheses stay labelled.
6. **Small and complete.** Prefer a small, complete, demonstrably useful user journey over a broad
   collection of incomplete features.

Final test: **does this help someone make their next career move with other people, rather than
having to do it alone?**

## Repository map

| Path | What | Status (2026-10-28) |
| --- | --- | --- |
| `apps/web/` | Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4 | Static placeholder pages only |
| `packages/shared/` | Zod schemas and types shared by web and AI | Schemas exist; not yet imported anywhere |
| `services/ai/` | Model provider abstraction + deterministic demo provider | Meta provider is a stub that returns demo output |
| `supabase/migrations/` | SQL migrations, RLS policies, seed | Empty |
| `data/` | `raw/`, `processed/` (git-ignored), `fixtures/` (synthetic, committed) | See `data/README.md` |
| `research/` | Research reports (Kilo by default) | See `docs/RESEARCH_PROTOCOL.md` |
| `docs/` | Source-of-truth design docs; `docs/decisions/` for ADRs | |
| `planning/` | Next steps, MVP checklist, timeline, known issues | |

**Assets:** web runtime files go in `apps/web/public/`. No root `assets/` folder for now. Create
one only when there are source design files or brand references to share, and never keep a
second copy of a file that already lives in `public/`.

The root `package.json` defines npm workspaces (`apps/*`, `packages/*`, `services/*`), and the
web app imports `@tulay/shared` and `@tulay/ai` (wired 2026-10-28).

## Commands

```bash
cd apps/web
npm install          # or npm ci once package-lock.json is committed
npm run dev          # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build
```

No test runner is configured yet. Do not claim tests pass when none exist; say so.

## Working rules for every agent

- **Before a task:** `git status -sb`, `git log --oneline -10`, read the docs for the area you
  will touch, and confirm the task has an owner, scope, acceptance criteria, verification steps
  and expected files (`docs/AGENT_WORKFLOW.md`).
- **One owner per file at a time.** Do not edit files another agent has in progress without an
  explicit hand-off.
- **Scope tightly.** Match surrounding style. No new frameworks, services or abstractions without
  a concrete requirement.
- **Never invent APIs.** Meta Model API endpoints, model names, SDK methods, auth headers and
  limits must come from official documentation, cited in `docs/AI_AGENT_DESIGN.md`. Same for any
  job-data source and its licence.
- **Never commit** secrets, `.env*` (except `.env.example`), real user data, private messages,
  `data/raw/`, `data/processed/`, `node_modules/`, `.next/`, `*.tsbuildinfo`.
- **Do not commit automatically.** Commit only when a human asks. Never force-push, reset, rewrite
  shared history, or discard someone else's changes. Conventions: `docs/COMMIT_CONVENTIONS.md`.
- **Verify, then report honestly.** Run lint, typecheck and build for areas you touched. Report
  failures as failures. If you could not run something, say so.
- **Hand off in writing.** Changed files, checks run and their results, unfinished work, next
  action. Format in `docs/AGENT_WORKFLOW.md`.
- **Update docs with decisions.** Architecture or product changes update the relevant doc in
  `docs/`; significant ones get an ADR in `docs/decisions/`.

## Where to find things

`docs/PROJECT_DIRECTION.md` (product north star, canonical), `docs/PRODUCT_SPEC.md` (what), `docs/ARCHITECTURE.md` and
`docs/TECH_STACK.md` (how), `docs/DATA_MODEL.md`, `docs/AI_AGENT_DESIGN.md`,
`docs/SECURITY_AND_PRIVACY.md`, `docs/RESEARCH_PROTOCOL.md`, `docs/AGENT_WORKFLOW.md`,
`planning/NEXT_STEPS.md`.
